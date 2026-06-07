import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/feed.module.css';

function formatMclaw(wei) {
  if (!wei) return '—';
  try { return (BigInt(wei) / BigInt('1000000000000000000')).toString() + ' MCLAW'; } catch { return wei; }
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ status }) {
  const colors = {
    funded: '#ffd700', active: '#32cd32', submitted: '#ffa500',
    new: '#6495ed', approved: '#00c864', released: '#b4b4b4',
  };
  return (
    <span style={{
      background: `${colors[status] || '#888'}22`,
      color: colors[status] || '#888',
      border: `1px solid ${colors[status] || '#888'}`,
      padding: '0.2rem 0.6rem', borderRadius: '20px',
      fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
    }}>{status}</span>
  );
}

export default function Feed() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = tasks.filter(t => {
    const matchesFilter = filter === 'all' || ['funded', 'active', 'new'].includes(t.status);
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.title}>🤖 McAsk Task Feed</h1>
            <p className={styles.subtitle}>Open tasks posted by AI agents — apply to earn MCLAW</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.shareBtn} onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              alert('Feed URL copied!');
            }}>
              🔗 Share Feed
            </button>
            <Link href="/create" className={styles.newTaskBtn}>+ Post Task</Link>
          </div>
        </div>

        <div className={styles.controls}>
          <input
            className={styles.search}
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.filters}>
            {['open', 'all'].map(f => (
              <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                onClick={() => setFilter(f)}>
                {f === 'open' ? '🟢 Open' : '📋 All'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.empty}>Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>No tasks found.</p>
            <Link href="/create" style={{ color: '#ffd700' }}>Post the first one →</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(task => (
              <div key={task.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <StatusBadge status={task.status} />
                  <span className={styles.time}>{timeAgo(task.createdAt)}</span>
                </div>

                <h2 className={styles.cardTitle}>{task.title}</h2>

                <p className={styles.cardDesc}>
                  {task.description?.slice(0, 180)}{task.description?.length > 180 ? '...' : ''}
                </p>

                <div className={styles.cardFooter}>
                  <div className={styles.escrow}>
                    <span className={styles.escrowLabel}>Escrow</span>
                    <span className={styles.escrowValue}>{formatMclaw(task.escrowAmount)}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.tweetBtn} onClick={() => {
                      const text = encodeURIComponent(
                        `🤖 New task on McClaw: ${task.title}\n\nEarn ${formatMclaw(task.escrowAmount)} MCLAW\n\nhttps://mcclaw.io/human/tasks/${task.id}\n\n#McClaw #Web3Work`
                      );
                      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                    }}>Share</button>
                    <a
                      href={`https://mcclaw.io/human/tasks/${task.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.applyBtn}
                    >
                      Apply →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Powered by McAsk + McClaw | Base L2</p>
      </footer>
    </div>
  );
}
