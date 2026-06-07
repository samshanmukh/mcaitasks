import { execFile } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { tweetTask, notifyAll } from '../../lib/notify';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { description, agentName, escrowMclaw } = req.body;

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: 'Description is required' });
  }

  try {
    console.log('Calling Claude API...');

    const claudeResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: `You are an expert task specification writer for a decentralized work marketplace called McClaw.

A user wants to create a task with the following description:
"${description}"

Generate a detailed, professional task specification in JSON format ONLY (no preamble or explanation). The JSON must have exactly these fields:

{
  "title": "Clear, concise task title (5-10 words)",
  "description": "Detailed description of what needs to be done (2-3 paragraphs, clear steps)",
  "acceptanceCriteria": "Specific, measurable criteria for success (bullet points)",
  "timeEstimate": "Realistic time estimate in hours",
  "instructions": "Step-by-step instructions for completion"
}

Make the task clear, executable, and verifiable by humans. Be specific and professional.`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const claudeText = claudeResponse.data.content[0].text;
    console.log('Claude response:', claudeText);

    let taskSpec;

    // Try 1: raw JSON
    try { taskSpec = JSON.parse(claudeText.trim()); } catch {}

    // Try 2: content between ```json ... ``` fences
    if (!taskSpec) {
      try {
        const fenceMatch = claudeText.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenceMatch) taskSpec = JSON.parse(fenceMatch[1].trim());
      } catch {}
    }

    // Try 3: first { ... } block in the response
    if (!taskSpec) {
      try {
        const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
        if (jsonMatch) taskSpec = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    if (!taskSpec) {
      throw new Error(`Could not parse Claude response as JSON: ${claudeText.slice(0, 300)}`);
    }

    // Build a single description string since the CLI only accepts --description
    const fullDescription = [
      taskSpec.description,
      `\nAcceptance Criteria:\n${taskSpec.acceptanceCriteria}`,
      `\nInstructions:\n${taskSpec.instructions}`,
      `\nTime Estimate: ${taskSpec.timeEstimate}`,
      agentName ? `\nPosted by: ${agentName}` : ''
    ].filter(Boolean).join('');

    // Pre-flight: check MCLAW balance before attempting task creation
    const escrowUnits = Math.max(1, parseFloat(escrowMclaw) || 1);
    const ESCROW_AMOUNT = BigInt(Math.round(escrowUnits * 1e18).toString());
    const { stdout: balanceOut } = await execFileAsync(
      process.execPath,
      [require('path').join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs'), 'balance'],
      {
        env: {
          ...process.env,
          MCCLAW_PRIVATE_KEY: process.env.MCCLAW_PRIVATE_KEY,
          MCCLAW_RPC_URL: process.env.MCCLAW_RPC_URL,
          MCCLAW_API_URL: process.env.MCCLAW_API_URL,
          MCCLAW_API_KEY: process.env.MCCLAW_API_KEY,
        },
        timeout: 15000
      }
    );
    const { balance } = JSON.parse(balanceOut);
    const balanceBigInt = BigInt(balance || '0');
    if (balanceBigInt < ESCROW_AMOUNT) {
      const have = Number(balanceBigInt) / 1e18;
      const need = Number(ESCROW_AMOUNT) / 1e18;
      return res.status(402).json({
        error: 'Insufficient MCLAW balance',
        details: `Agent wallet has ${have} MCLAW but needs ${need} MCLAW to post a task. Top up 0x4f9515024c205d5b80D44A61e5808F418B59dC94 on Base.`,
        balance: have,
        required: need,
      });
    }

    console.log(`Balance check passed: ${Number(balanceBigInt) / 1e18} MCLAW available`);
    console.log('Creating task via mcclaw-agent CLI...');

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        require('path').join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs'),
        'create-task',
        '--title', taskSpec.title,
        '--description', fullDescription,
        '--escrow-amount', ESCROW_AMOUNT.toString()
      ],
      {
        env: {
          ...process.env,
          MCCLAW_PRIVATE_KEY: process.env.MCCLAW_PRIVATE_KEY,
          MCCLAW_RPC_URL: process.env.MCCLAW_RPC_URL,
          MCCLAW_API_URL: process.env.MCCLAW_API_URL,
          MCCLAW_API_KEY: process.env.MCCLAW_API_KEY,
        },
        timeout: 60000
      }
    );

    console.log('mcclaw-agent stdout:', stdout);
    if (stderr) console.warn('mcclaw-agent stderr:', stderr);

    // Parse task ID and tx hash from CLI output (JSON or plain text fallback)
    let mcclawTaskId;
    let transactionHash;
    try {
      const parsed = JSON.parse(stdout);
      mcclawTaskId = parsed.taskId || parsed.id || parsed.task?.id;
      transactionHash = parsed.transactionHash || parsed.txHash;
    } catch {
      const idMatch = stdout.match(/task[_\s-]?id[:\s"]+([a-zA-Z0-9_-]+)/i);
      const txMatch = stdout.match(/0x[a-fA-F0-9]{64}/);
      mcclawTaskId = idMatch?.[1];
      transactionHash = txMatch?.[0];
    }

    if (!mcclawTaskId) {
      throw new Error(`Could not parse task ID from CLI output: ${stdout}`);
    }

    const taskUrl = `https://mcclaw.io/tasks/${mcclawTaskId}`;

    // Fire notifications in background — don't block the response
    Promise.all([
      tweetTask(taskSpec, mcclawTaskId),
      notifyAll(
        `🤖 New task posted by McAsk!\n*${taskSpec.title}*\n${taskUrl}`,
        [['Time Estimate', taskSpec.timeEstimate], ['Posted by', agentName || 'McAsk Agent']]
      ),
    ]).catch(e => console.error('Notification error:', e.message));

    return res.status(200).json({
      success: true,
      taskSpec,
      mcclawTaskId,
      transactionHash,
      taskUrl,
    });
  } catch (error) {
    console.error('Error:', error.message);

    return res.status(500).json({
      error: 'Failed to generate and post task',
      details: error.message
    });
  }
}
