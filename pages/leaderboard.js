import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/leaderboard.module.css';

function shortAddr(addr) {
  if (!addr || addr === 'unknown') return '—';
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function Medal({ rank }) {
  if (rank === 1) return <span className={styles.medal}>🥇</span>;
  if (rank === 2) return <span className={styles.medal}>🥈</span>;
  if (rank === 3) return <span className={styles.medal}>🥉</span>;
  return <span className={styles.rankNum}>#{rank}</span>;
}

function RepBar({ score, max }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className={styles.repBarWrap}>
      <div className={styles.repBar} style={{ width: `${pct}%` }} />
      <span className={styles.repScore}>{score}</span>
    </div>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const leaderboard = data?.leaderboard || [];
  const maxRep = Math.max(...leaderboard.map(w => w.reputation), 1);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🏆 Leaderboard</h1>
        <p className={styles.subtitle}>Top workers ranked by tasks completed on McClaw</p>
        <nav className={styles.nav}>
          <Link href="/create" className={styles.navLink}>+ New Task</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
          <Link href="/feed" className={styles.navLink}>Feed</Link>
          <Link href="/timeline" className={styles.navLink}>Timeline</Link>
        </nav>
      </header>

      <main className={styles.main}>
        {loading ? (
          <div className={styles.state}>Loading leaderboard...</div>
        ) : error ? (
          <div className={styles.stateError}>Error: {error}</div>
        ) : leaderboard.length === 0 ? (
          <div className={styles.state}>
            <p>No workers yet — post a task to get started!</p>
            <Link href="/create" className={styles.ctaLink}>Post a task →</Link>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            <div className={styles.podium}>
              {leaderboard.slice(0, 3).map((w, i) => (
                <div key={w.address} className={`${styles.podiumCard} ${styles['podium' + (i + 1)]}`}>
                  <Medal rank={i + 1} />
                  <div className={styles.podiumAddr}>{shortAddr(w.address)}</div>
                  <div className={styles.podiumCompleted}>{w.completed}</div>
                  <div className={styles.podiumLabel}>completed</div>
                  <div className={styles.podiumApps}>{w.applications} applied</div>
                </div>
              ))}
            </div>

            {/* Full table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Worker</th>
                    <th>Completed</th>
                    <th>Applied</th>
                    <th>Reputation</th>
                    <th>Basescan</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((w, i) => (
                    <tr key={w.address} className={i < 3 ? styles.topRow : ''}>
                      <td><Medal rank={i + 1} /></td>
                      <td>
                        <span className={styles.addrFull} title={w.address}>
                          {shortAddr(w.address)}
                        </span>
                      </td>
                      <td><strong className={styles.completedNum}>{w.completed}</strong></td>
                      <td>{w.applications}</td>
                      <td><RepBar score={w.reputation} max={maxRep} /></td>
                      <td>
                        {w.address && w.address !== 'unknown' ? (
                          <a
                            href={`https://basescan.org/address/${w.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.scanLink}
                          >↗</a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data?.totalTasks != null && (
              <p className={styles.footnote}>Aggregated from {data.totalTasks} tasks on-chain</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
