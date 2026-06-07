import { execFile } from 'child_process';
import { promisify } from 'util';
import { CLI_PATH, getCliEnv } from '../../lib/cliEnv';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [CLI_PATH, 'list-tasks'],
      { env: getCliEnv(req), timeout: 15000 }
    );
    const parsed = JSON.parse(stdout);
    const tasks = parsed.tasks ?? (Array.isArray(parsed) ? parsed : [parsed]);
    return res.status(200).json({ tasks });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
