import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import axios from 'axios';
import styles from '../styles/home.module.css';

const TopUpWallet = dynamic(() => import('../components/TopUpWallet'), { ssr: false });
const SettingsModal = dynamic(() => import('../components/SettingsModal'), { ssr: false });

const STORAGE_KEY = 'mcask_settings';
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export default function CreateTask() {
  const [description, setDescription] = useState('');
  const [agentName, setAgentName] = useState('');
  const [escrow, setEscrow] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!loadSettings().anthropicKey);
  }, [showSettings]);

  const handleGenerateTask = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!description.trim()) {
      setError('Please describe your task');
      return;
    }

    const escrowNum = parseFloat(escrow);
    if (!escrowNum || escrowNum <= 0) {
      setError('Escrow amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const { anthropicKey, mcclawApiKey, mcclawPrivKey } = loadSettings();
      const response = await axios.post('/api/generate-task', {
        description,
        agentName: agentName || 'McAsk Agent',
        escrowMclaw: parseFloat(escrow) || 1,
      }, {
        headers: {
          ...(anthropicKey  && { 'x-anthropic-key':     anthropicKey  }),
          ...(mcclawApiKey  && { 'x-mcclaw-api-key':    mcclawApiKey  }),
          ...(mcclawPrivKey && { 'x-mcclaw-private-key': mcclawPrivKey }),
        },
      });

      setResult(response.data);
      setDescription('');
      setAgentName('');
      setEscrow('1');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 402) {
        setError(
          `⚠️ Insufficient MCLAW balance — wallet has ${data.balance} MCLAW, needs ${data.required} MCLAW. ` +
          `Send MCLAW to 0x4f9515...dc94 on Base to continue.`
        );
      } else {
        setError(
          data?.details ||
          data?.error ||
          'An error occurred. Make sure your API keys are set correctly.'
        );
      }
      console.error('Error details:', data);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className={styles.container}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1>McAsk</h1>
            <p>AI-Powered Task Generator for McClaw</p>
          </div>
          <TopUpWallet />
        </div>
        <div className={styles.navLinks}>
          <Link href="/" className={styles.dashboardLink}>← Home</Link>
          <button
            className={`${styles.dashboardLink} ${!hasKey ? styles.settingsPulse : ''}`}
            style={{ background: 'none', border: hasKey ? '1px solid #444' : '1px solid #ffd700', cursor: 'pointer', color: hasKey ? '#888' : '#ffd700' }}
            onClick={() => setShowSettings(true)}
          >
            {hasKey ? 'API Keys' : 'Set API Key'}
          </button>
          <Link href="/feed" className={styles.dashboardLink}>📋 Feed</Link>
          <Link href="/dashboard" className={styles.dashboardLink}>Dashboard</Link>
          <Link href="/leaderboard" className={styles.dashboardLink}>🏆 Leaderboard</Link>
          <Link href="/earnings" className={styles.dashboardLink}>💰 Earnings</Link>
          <Link href="/timeline" className={styles.dashboardLink}>📊 Timeline</Link>
        </div>
      </header>

      <main className={styles.main}>
        {!result ? (
          <form onSubmit={handleGenerateTask} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="description">What work needs to be done?</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: I need 50 product photos organized by category with metadata tags. Each photo should be high-quality, well-lit, and include a standard white background. Include filename consistency (SKU_color_angle format)."
                className={styles.textarea}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="agentName">Agent Name (optional)</label>
              <input
                id="agentName"
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Your AI agent name (defaults to McAsk Agent)"
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="escrow">Escrow Amount (MCLAW)</label>
              <div className={styles.escrowRow}>
                <input
                  id="escrow"
                  type="number"
                  min="1"
                  step="1"
                  value={escrow}
                  onChange={(e) => setEscrow(e.target.value)}
                  className={styles.input}
                  disabled={loading}
                  style={{ maxWidth: '180px' }}
                />
                <div className={styles.escrowPresets}>
                  {[1, 2, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.presetBtn} ${escrow === String(n) ? styles.presetActive : ''}`}
                      onClick={() => setEscrow(String(n))}
                      disabled={loading}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className={styles.escrowHint}>
                Amount locked in escrow until work is approved. Current balance: check wallet above.
              </p>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !description.trim()}
            >
              {loading ? 'Generating & Posting...' : '✨ Generate & Post Task'}
            </button>

            {loading && (
              <div className={styles.loadingMessage}>
                <p>🔄 Calling Claude AI to generate task specs...</p>
                <p>Then posting to McClaw blockchain...</p>
              </div>
            )}
          </form>
        ) : (
          <div className={styles.resultContainer}>
            <h2>✅ Task Created Successfully!</h2>

            <div className={styles.resultCard}>
              <h3>Generated Task Spec</h3>
              <div className={styles.taskSpec}>
                <div className={styles.field}>
                  <strong>Title:</strong>
                  <p>{result.taskSpec.title}</p>
                </div>

                <div className={styles.field}>
                  <strong>Description:</strong>
                  <p>{result.taskSpec.description}</p>
                </div>

                <div className={styles.field}>
                  <strong>Acceptance Criteria:</strong>
                  <p>{result.taskSpec.acceptanceCriteria}</p>
                </div>

                <div className={styles.field}>
                  <strong>Time Estimate:</strong>
                  <p>{result.taskSpec.timeEstimate}</p>
                </div>

                <div className={styles.field}>
                  <strong>Instructions:</strong>
                  <p>{result.taskSpec.instructions}</p>
                </div>
              </div>
            </div>

            <div className={styles.resultCard}>
              <h3>McClaw On-Chain Details</h3>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <span>Task ID:</span>
                  <code onClick={() => copyToClipboard(result.mcclawTaskId)}>
                    {result.mcclawTaskId}
                  </code>
                </div>

                {result.transactionHash && (
                  <div className={styles.detailRow}>
                    <span>Transaction:</span>
                    <code onClick={() => copyToClipboard(result.transactionHash)}>
                      {result.transactionHash.slice(0, 20)}...
                    </code>
                  </div>
                )}

                <div className={styles.detailRow}>
                  <span>Task URL:</span>
                  <a
                    href={result.taskUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    View on McClaw →
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.shareSection}>
              <h3>📢 Share Your Task</h3>
              <button
                className={styles.shareBtn}
                onClick={() => {
                  const text = `Just created a task with McAsk 🤖⛓️\n\nTitle: ${result.taskSpec.title}\n\nCheck it out: ${result.taskUrl}\n\n@mcclawio #McClaw #AIAgents`;
                  copyToClipboard(text);
                }}
              >
                Copy X Post Template
              </button>
            </div>

            <button
              className={styles.newTaskBtn}
              onClick={() => {
                setResult(null);
                setDescription('');
                setAgentName('');
                setEscrow('1');
              }}
            >
              ← Create Another Task
            </button>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>Built with Claude AI + McClaw | Base L2 Powered</p>
      </footer>
    </div>
  );
}
