import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const CLI_ENV = {
  ...process.env,
  MCCLAW_PRIVATE_KEY: process.env.MCCLAW_PRIVATE_KEY,
  MCCLAW_RPC_URL: process.env.MCCLAW_RPC_URL,
  MCCLAW_API_URL: process.env.MCCLAW_API_URL,
  MCCLAW_API_KEY: process.env.MCCLAW_API_KEY,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [require('path').join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs'), 'list-tasks'],
      { env: CLI_ENV, timeout: 15000 }
    );
    const parsed = JSON.parse(stdout);
    const tasks = parsed.tasks ?? (Array.isArray(parsed) ? parsed : [parsed]);
    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
