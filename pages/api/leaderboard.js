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

const cli = (args) => execFileAsync(
  process.execPath,
  [require('path').join(process.cwd(), 'mcclaw-sdk/dist/cli.mjs'), ...args],
  { env: CLI_ENV, timeout: 15000 }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { stdout: tasksOut } = await cli(['list-tasks']);
    const { tasks } = JSON.parse(tasksOut);

    // Fetch applications for all tasks in parallel
    const applicationSets = await Promise.all(
      tasks.map(async (task) => {
        try {
          const { stdout } = await cli(['list-applications', task.id]);
          const apps = JSON.parse(stdout) || [];
          return apps.map(app => ({ ...app, taskId: task.id, taskStatus: task.status }));
        } catch {
          return [];
        }
      })
    );

    // Aggregate by worker address
    const workers = {};
    for (const apps of applicationSets) {
      for (const app of apps) {
        const addr = app.workerAddress || app.applicantAddress || app.address || 'unknown';
        if (!workers[addr]) {
          workers[addr] = {
            address: addr,
            applications: 0,
            completed: 0,
            reputation: app.reputationScore || app.reputation || 0,
          };
        }
        workers[addr].applications++;
        if (['approved', 'released'].includes(app.taskStatus)) {
          workers[addr].completed++;
        }
        // Take highest reputation score seen
        const rep = app.reputationScore || app.reputation || 0;
        if (rep > workers[addr].reputation) workers[addr].reputation = rep;
      }
    }

    const leaderboard = Object.values(workers)
      .sort((a, b) => b.completed - a.completed || b.applications - a.applications)
      .slice(0, 20);

    return res.status(200).json({ leaderboard, totalTasks: tasks.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
