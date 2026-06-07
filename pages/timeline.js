import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/timeline.module.css';

const COLUMNS = [
  { key: 'new',       label: 'New',       color: '#6495ed' },
  { key: 'funded',    label: 'Funded',    color: '#ffd700' },
  { key: 'active',    label: 'Active',    color: '#32cd32' },
  { key: 'submitted', label: 'Submitted', color: '#ffa500' },
  { key: 'approved',  label: 'Approved',  color: '#00c864' },
  { key: 'released',  label: 'Released',  color: '#aaaaaa' },
];

function formatMclaw(wei) {
  if (!wei) return null;
  try { return (BigInt(wei) / BigInt('1000000000000000000')).toString() + ' MCLAW'; } catch { return null; }
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TaskCard({ task, color }) {
  const escrow = formatMclaw(task.escrowAmount);
  return (
    <a
      href={`https://mcclaw.io/human/tasks/${task.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      style={{ borderLeftColor: color }}
    >
      <div className={styles.cardTitle}>{task.title}</div>
      {escrow && <div className={styles.cardEscrow}>{escrow}</div>}
      <div className={styles.cardMeta}>
        <span className={styles.cardId}>{task.id?.slice(0, 8)}…</span>
        <span className={styles.cardTime}>{timeAgo(task.createdAt)}</span>
      </div>
    </a>
  );
}

export default function Timeline() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchTasks = () => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => {
        setTasks(d.tasks || []);
        setLastRefresh(new Date());
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => {
    fetchTasks();
    const t = setInterval(fetchTasks, 15000);
    return () => clearInterval(t);
  }, []);

  const byStatus = {};
  COLUMNS.forEach(c => { byStatus[c.key] = []; });
  tasks.forEach(t => {
    const col = byStatus[t.status];
    if (col) col.push(t);
    // unknowns fall into 'new' as fallback
    else if (byStatus.new) byStatus.new.push(t);
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>📊 Task Timeline</h1>
            <p className={styles.subtitle}>Visual flow of tasks through McClaw lifecycle</p>
          </div>
          <div className={styles.headerRight}>
            {lastRefresh && (
              <span className={styles.refreshTime}>
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button className={styles.refreshBtn} onClick={fetchTasks}>↻ Refresh</button>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link href="/create" className={styles.navLink}>+ New Task</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link href="/feed" className={styles.navLink}>Feed</Link>
          <Link href="/leaderboard" className={styles.navLink}>🏆 Leaderboard</Link>
        </nav>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.state}>Loading tasks...</div>
        ) : error ? (
          <div className={styles.stateError}>Error: {error}</div>
        ) : (
          <div className={styles.board}>
            {COLUMNS.map(col => {
              const colTasks = byStatus[col.key] || [];
              return (
                <div key={col.key} className={styles.column}>
                  <div className={styles.colHeader} style={{ borderTopColor: col.color }}>
                    <span className={styles.colLabel} style={{ color: col.color }}>{col.label}</span>
                    <span className={styles.colCount} style={{ background: `${col.color}22`, color: col.color }}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className={styles.colBody}>
                    {colTasks.length === 0 ? (
                      <div className={styles.empty}>—</div>
                    ) : (
                      colTasks.map(task => (
                        <TaskCard key={task.id} task={task} color={col.color} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flow legend */}
        <div className={styles.flow}>
          {COLUMNS.map((col, i) => (
            <span key={col.key}>
              <span className={styles.flowStep} style={{ color: col.color }}>{col.label}</span>
              {i < COLUMNS.length - 1 && <span className={styles.arrow}> → </span>}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
