import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from '../styles/dashboard.module.css';

const STATUS_ORDER = ['new', 'funded', 'active', 'submitted', 'approved', 'released', 'disputed', 'expired'];

function formatMclaw(wei) {
  if (!wei) return '—';
  try {
    return (BigInt(wei) / BigInt('1000000000000000000')).toString() + ' MCLAW';
  } catch {
    return wei;
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const key = (status || 'new').toLowerCase();
  return <span className={`${styles.badge} ${styles['badge_' + key] || styles.badge_new}`}>{status}</span>;
}

const weiToMclaw = (weiString) => {
  if (!weiString) return 0;
  return parseInt(weiString) / Math.pow(10, 18);
};

const calculateMetrics = (tasks) => {
  const totalMclawPosted = tasks.reduce((sum, task) => sum + weiToMclaw(task.escrowAmount), 0);
  const totalMclawStaked = tasks.reduce((sum, task) => sum + weiToMclaw(task.stakeAmount), 0);
  const completedTasks = tasks.filter(task => ['approved', 'released'].includes(task.status)).length;
  const inProgressTasks = tasks.filter(task => ['funded', 'active', 'submitted'].includes(task.status)).length;
  const totalTasks = tasks.length;
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  return {
    totalMclawPosted: totalMclawPosted.toFixed(2),
    totalMclawStaked: totalMclawStaked.toFixed(2),
    completedTasks,
    inProgressTasks,
    totalTasks,
    successRate,
  };
};

const EconomicsCard = ({ totalMclawPosted, totalMclawStaked }) => (
  <div className={styles.statsRow}>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#ffd700' }}>{totalMclawPosted}</div>
      <div className={styles.statLabel}>MCLAW POSTED</div>
      <div className={styles.statSubtext}>Total escrow across all tasks</div>
    </div>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#ffa500' }}>{totalMclawStaked}</div>
      <div className={styles.statLabel}>MCLAW STAKED</div>
      <div className={styles.statSubtext}>Upfront agent stake</div>
    </div>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#00ff88' }}>
        +{(totalMclawPosted - totalMclawStaked).toFixed(2)}
      </div>
      <div className={styles.statLabel}>POTENTIAL EARNINGS</div>
      <div className={styles.statSubtext}>Posted minus stake</div>
    </div>
  </div>
);

const CompletionMetricsCard = ({ completedTasks, inProgressTasks, totalTasks, successRate }) => (
  <div className={styles.statsRow}>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#00d4ff' }}>{inProgressTasks}</div>
      <div className={styles.statLabel}>IN PROGRESS</div>
      <div className={styles.statSubtext}>Active tasks awaiting completion</div>
    </div>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#00ff88' }}>{completedTasks}</div>
      <div className={styles.statLabel}>COMPLETED</div>
      <div className={styles.statSubtext}>Tasks with work submitted</div>
    </div>
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: '#ff00ff' }}>{successRate}%</div>
      <div className={styles.statLabel}>SUCCESS RATE</div>
      <div className={styles.statSubtext}>Completed vs total tasks</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef(null);
  const esRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Auto-refresh tasks every 10s
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 10000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  // SSE live event feed
  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents((prev) => [{ ...event, _time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
        // Refresh tasks on any task lifecycle event
        if (event.type === 'task_event' || event.type === 'application') {
          fetchTasks();
        }
      } catch {}
    };
    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => es.close();
  }, [fetchTasks]);

  // Auto-scroll feed to top is already handled by prepending

  const stats = {
    total: tasks.length,
    active: tasks.filter(t => ['funded', 'active', 'submitted'].includes(t.status)).length,
    approved: tasks.filter(t => t.status === 'approved' || t.status === 'released').length,
    escrow: tasks.reduce((sum, t) => {
      try { return sum + Number(BigInt(t.escrowAmount || 0) / BigInt('1000000000000000000')); } catch { return sum; }
    }, 0),
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🤖 McAsk Dashboard</h1>
        <div className={styles.headerNav}>
          <div className={styles.liveIndicator}>
            <span className={`${styles.liveDot} ${connected ? '' : styles.liveDotOff}`} />
            {connected ? 'Live' : 'Reconnecting...'}
          </div>
          <Link href="/feed" className={styles.navLink}>📋 Feed</Link>
          <Link href="/leaderboard" className={styles.navLink}>🏆 Leaderboard</Link>
          <Link href="/earnings" className={styles.navLink}>💰 Earnings</Link>
          <Link href="/timeline" className={styles.navLink}>📊 Timeline</Link>
          <Link href="/create" className={styles.navLink}>+ New Task</Link>
        </div>
      </header>

      <div className={styles.main}>
        {/* Left: tasks */}
        <div>
          {(() => { const metrics = calculateMetrics(tasks); return (
            <>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>💰 Economics</h2>
                <EconomicsCard totalMclawPosted={metrics.totalMclawPosted} totalMclawStaked={metrics.totalMclawStaked} />
              </div>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📈 Completion Metrics</h2>
                <CompletionMetricsCard completedTasks={metrics.completedTasks} inProgressTasks={metrics.inProgressTasks} totalTasks={metrics.totalTasks} successRate={metrics.successRate} />
              </div>
            </>
          ); })()}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Tasks</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.active}</div>
              <div className={styles.statLabel}>In Progress</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.approved}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.escrow}</div>
              <div className={styles.statLabel}>MCLAW Staked</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Posted Tasks</h2>
              <button className={styles.refreshBtn} onClick={fetchTasks}>
                ↻ Refresh {lastRefresh && `· ${lastRefresh.toLocaleTimeString()}`}
              </button>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading tasks...</div>
            ) : error ? (
              <div className={styles.loading} style={{ color: '#ff8080' }}>Error: {error}</div>
            ) : tasks.length === 0 ? (
              <div className={styles.empty}>
                <p>No tasks yet.</p>
                <p><Link href="/create" style={{ color: '#ffd700' }}>Create your first task →</Link></p>
              </div>
            ) : (
              <table className={styles.taskTable}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Escrow</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td><div className={styles.taskTitle} title={task.title}>{task.title}</div></td>
                      <td><StatusBadge status={task.status} /></td>
                      <td><span className={styles.escrow}>{formatMclaw(task.escrowAmount)}</span></td>
                      <td><span className={styles.taskDate}>{formatDate(task.createdAt)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: live event feed */}
        <div className={`${styles.section} ${styles.feedPanel}`}>
          <div className={styles.sectionHeader}>
            <h2>⚡ Live Events</h2>
            <button className={styles.clearBtn} onClick={() => setEvents([])}>Clear</button>
          </div>

          <div className={styles.feedScroll} ref={feedRef}>
            {events.length === 0 ? (
              <div className={styles.empty}>
                <p>Waiting for events...</p>
                <p style={{ fontSize: '0.8rem' }}>Applications and task updates will appear here in real time.</p>
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className={`${styles.feedEvent} ${styles['feedEvent_' + (ev.type || 'raw')]}`}>
                  <div className={styles.feedEventType}>{ev.type || 'event'}</div>
                  <div className={styles.feedEventBody}>
                    {ev.message || (ev.taskId ? `Task ${ev.taskId.slice(0, 8)}… — ${ev.event || ''}` : JSON.stringify(ev))}
                  </div>
                  <div className={styles.feedEventTime}>{ev._time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
