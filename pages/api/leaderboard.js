import { execFile } from 'child_process';
import { promisify } from 'util';
import { CLI_PATH, getCliEnv } from '../../lib/cliEnv';

const execFileAsync = promisify(execFile);

const cli = (args, req) => execFileAsync(
  process.execPath,
  [CLI_PATH, ...args],
  { env: getCliEnv(req), timeout: 15000 }
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { stdout: tasksOut } = await cli(['list-tasks'], req);
    const { tasks } = JSON.parse(tasksOut);

    const applicationSets = await Promise.all(
      tasks.map(async (task) => {
        try {
          const { stdout } = await cli(['list-applications', task.id], req);
          const apps = JSON.parse(stdout) || [];
          return apps.map(app => ({ ...app, taskId: task.id, taskStatus: task.status }));
        } catch {
          return [];
        }
      })
    );

    const workers = {};
    for (const apps of applicationSets) {
      for (const app of apps) {
        const addr = app.workerAddress || app.applicantAddress || app.address || 'unknown';
        if (!workers[addr]) {
          workers[addr] = { address: addr, applications: 0, completed: 0, reputation: app.reputationScore || app.reputation || 0 };
        }
        workers[addr].applications++;
        if (['approved', 'released'].includes(app.taskStatus)) workers[addr].completed++;
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
