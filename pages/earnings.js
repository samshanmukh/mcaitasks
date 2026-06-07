import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import styles from '../styles/earnings.module.css';

const weiToMclaw = (wei) => {
  if (!wei) return 0;
  try { return Number(BigInt(wei) / BigInt('1000000000000000000')); } catch { return 0; }
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildChartData(tasks) {
  if (!tasks.length) return [];

  const sorted = [...tasks].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  let cumulativeSpent = 0;
  let cumulativeEarned = 0;

  return sorted.map((task, i) => {
    const escrow = weiToMclaw(task.escrowAmount);
    const isComplete = ['approved', 'released'].includes(task.status);

    cumulativeSpent += escrow;
    if (isComplete) cumulativeEarned += escrow;

    return {
      name: formatDate(task.createdAt),
      task: i + 1,
      spent: cumulativeSpent,
      earned: cumulativeEarned,
      netPosition: cumulativeEarned - cumulativeSpent,
      escrow,
      status: task.status,
      title: task.title?.slice(0, 30),
    };
  });
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>Task {payload[0]?.payload?.task}: {payload[0]?.payload?.title}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: {p.value?.toFixed(2)} MCLAW
        </p>
      ))}
    </div>
  );
};

export default function Earnings() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const chartData = buildChartData(tasks);
  const totalSpent = tasks.reduce((s, t) => s + weiToMclaw(t.escrowAmount), 0);
  const totalEarned = tasks.filter(t => ['approved', 'released'].includes(t.status))
    .reduce((s, t) => s + weiToMclaw(t.escrowAmount), 0);
  const inEscrow = tasks.filter(t => ['funded', 'active', 'submitted'].includes(t.status))
    .reduce((s, t) => s + weiToMclaw(t.escrowAmount), 0);
  const netPosition = totalEarned - totalSpent;
  const breakEvenAt = totalSpent > 0
    ? `${Math.ceil(totalSpent / Math.max(totalEarned / Math.max(tasks.filter(t => ['approved', 'released'].includes(t.status)).length, 1), 0.01))} tasks`
    : 'N/A';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>💰 Earnings Tracker</h1>
        <p className={styles.subtitle}>MCLAW spent vs recovered — break-even analysis</p>
        <nav className={styles.nav}>
          <Link href="/create" className={styles.navLink}>+ New Task</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link href="/leaderboard" className={styles.navLink}>🏆 Leaderboard</Link>
          <Link href="/timeline" className={styles.navLink}>Timeline</Link>
        </nav>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.state}>Loading earnings data...</div>
        ) : error ? (
          <div className={styles.stateError}>Error: {error}</div>
        ) : (
          <>
            {/* Summary stats */}
            <div className={styles.statsRow}>
              <StatCard label="Total Spent" value={`${totalSpent.toFixed(2)}`} sub="MCLAW in escrow created" color="#ff6b6b" />
              <StatCard label="Recovered" value={`${totalEarned.toFixed(2)}`} sub="MCLAW from approved tasks" color="#00c864" />
              <StatCard label="In Escrow" value={`${inEscrow.toFixed(2)}`} sub="MCLAW locked in active tasks" color="#ffd700" />
              <StatCard
                label="Net Position"
                value={`${netPosition >= 0 ? '+' : ''}${netPosition.toFixed(2)}`}
                sub={netPosition >= 0 ? 'Profitable' : 'Break-even not reached'}
                color={netPosition >= 0 ? '#00c864' : '#ff6b6b'}
              />
            </div>

            {tasks.length === 0 ? (
              <div className={styles.emptyChart}>
                <p>No tasks yet. Post a task to start tracking earnings.</p>
                <Link href="/create" className={styles.ctaLink}>Post a task →</Link>
              </div>
            ) : (
              <>
                {/* Cumulative area chart */}
                <div className={styles.chartSection}>
                  <h2 className={styles.chartTitle}>Cumulative MCLAW: Spent vs Recovered</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00c864" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00c864" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} tickFormatter={v => `${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ color: '#aaa', fontSize: '0.85rem' }}
                        formatter={(v) => v === 'spent' ? 'Total Spent' : 'Total Recovered'}
                      />
                      <Area type="monotone" dataKey="spent" name="spent" stroke="#ff6b6b" fill="url(#spentGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="earned" name="earned" stroke="#00c864" fill="url(#earnedGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Net position chart */}
                <div className={styles.chartSection}>
                  <h2 className={styles.chartTitle}>Net Position Over Time</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="#ffd700" strokeDasharray="6 3" label={{ value: 'Break-even', fill: '#ffd700', fontSize: 11 }} />
                      <Line
                        type="monotone"
                        dataKey="netPosition"
                        name="Net Position"
                        stroke="#00d4ff"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#00d4ff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Per-task escrow bar chart */}
                <div className={styles.chartSection}>
                  <h2 className={styles.chartTitle}>Escrow per Task</h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="task" stroke="#666" tick={{ fill: '#999', fontSize: 11 }} label={{ value: 'Task #', position: 'insideBottom', fill: '#666', fontSize: 11, dy: 10 }} />
                      <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 6 }}
                        labelStyle={{ color: '#aaa' }}
                        formatter={(v, n, p) => [`${v} MCLAW`, p.payload.title]}
                      />
                      <Bar dataKey="escrow" name="Escrow" fill="#ffd700" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Break-even callout */}
                <div className={styles.breakEven}>
                  <div className={styles.breakEvenItem}>
                    <span className={styles.breakEvenLabel}>Tasks to break even</span>
                    <span className={styles.breakEvenValue}>{breakEvenAt}</span>
                  </div>
                  <div className={styles.breakEvenItem}>
                    <span className={styles.breakEvenLabel}>Recovery rate</span>
                    <span className={styles.breakEvenValue}>
                      {totalSpent > 0 ? `${((totalEarned / totalSpent) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className={styles.breakEvenItem}>
                    <span className={styles.breakEvenLabel}>Avg escrow / task</span>
                    <span className={styles.breakEvenValue}>
                      {tasks.length > 0 ? `${(totalSpent / tasks.length).toFixed(2)} MCLAW` : '—'}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
