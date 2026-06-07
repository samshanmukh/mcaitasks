import { spawn } from 'child_process';
import { notifyAll } from '../../lib/notify';

export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const child = spawn(
    process.execPath,
    [require('path').join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs'), 'watch'],
    {
      env: {
        ...process.env,
        MCCLAW_PRIVATE_KEY: process.env.MCCLAW_PRIVATE_KEY,
        MCCLAW_RPC_URL: process.env.MCCLAW_RPC_URL,
        MCCLAW_API_URL: process.env.MCCLAW_API_URL,
        MCCLAW_API_KEY: process.env.MCCLAW_API_KEY,
      }
    }
  );

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  send({ type: 'connected', message: 'Listening for McClaw events...' });

  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        send(event);
        // Webhook notifications for key events
        if (event.type === 'application') {
          notifyAll(
            `📬 New application on task \`${event.taskId?.slice(0, 8)}…\`\nhttps://mcclaw.io/tasks/${event.taskId}`,
            [['Applicant', event.applicantAddress || 'unknown'], ['Task', event.taskId || '']]
          ).catch(() => {});
        } else if (event.type === 'task_event' && event.event === 'TaskSubmitted') {
          notifyAll(
            `✅ Work submitted on task \`${event.taskId?.slice(0, 8)}…\` — review needed!\nhttps://mcclaw.io/tasks/${event.taskId}`,
            [['Task ID', event.taskId || ''], ['Event', event.event || '']]
          ).catch(() => {});
        }
      } catch {
        send({ type: 'raw', message: trimmed });
      }
    }
  });

  child.stderr.on('data', (chunk) => {
    send({ type: 'error', message: chunk.toString().trim() });
  });

  child.on('close', () => send({ type: 'disconnected', message: 'Watch process ended' }));

  req.on('close', () => child.kill());
}
