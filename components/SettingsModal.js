import { useState, useEffect } from 'react';
import styles from '../styles/settings.module.css';

export const STORAGE_KEY = 'mcask_settings';

export function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export function useSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => { setSettings(loadSettings()); }, []);
  const save = (next) => {
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };
  return { settings, save };
}

function Field({ label, badge, hint, link, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {badge && <span className={styles.badge}>{badge}</span>}
      </label>
      {hint && (
        <p className={styles.hint}>
          {hint}{link && <> — <a href={link.url} target="_blank" rel="noopener noreferrer" className={styles.link}>{link.label}</a></>}
        </p>
      )}
      {children}
    </div>
  );
}

function KeyInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.inputRow}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
        spellCheck={false}
        autoComplete="off"
      />
      <button type="button" className={styles.toggleBtn} onClick={() => setShow(s => !s)}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export default function SettingsModal({ onClose }) {
  const [anthropicKey,   setAnthropicKey]   = useState('');
  const [mcclawApiKey,   setMcclawApiKey]   = useState('');
  const [mcclawPrivKey,  setMcclawPrivKey]  = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setAnthropicKey(s.anthropicKey   || '');
    setMcclawApiKey(s.mcclawApiKey   || '');
    setMcclawPrivKey(s.mcclawPrivKey || '');
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const next = {
      anthropicKey:  anthropicKey.trim(),
      mcclawApiKey:  mcclawApiKey.trim(),
      mcclawPrivKey: mcclawPrivKey.trim(),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose?.(); }, 900);
  };

  const clearAll = () => {
    setAnthropicKey(''); setMcclawApiKey(''); setMcclawPrivKey('');
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const anySet = anthropicKey || mcclawApiKey || mcclawPrivKey;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>API Settings</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave}>
          <Field
            label="Anthropic API Key"
            badge="Claude AI"
            hint="Generates task specs with Claude"
            link={{ url: 'https://console.anthropic.com', label: 'console.anthropic.com' }}
          >
            <KeyInput value={anthropicKey} onChange={setAnthropicKey} placeholder="sk-ant-api03-..." />
          </Field>

          <Field
            label="McClaw API Key"
            badge="McClaw"
            hint="Authenticates your agent with the McClaw platform"
            link={{ url: 'https://mcclaw.io', label: 'mcclaw.io' }}
          >
            <KeyInput value={mcclawApiKey} onChange={setMcclawApiKey} placeholder="0f0395fc88b7..." />
          </Field>

          <Field
            label="Agent Wallet Private Key"
            badge="On-chain"
            hint="Signs transactions and locks MCLAW escrow on Base L2. Never share this."
          >
            <KeyInput value={mcclawPrivKey} onChange={setMcclawPrivKey} placeholder="0x..." />
            {mcclawPrivKey && (
              <p className={styles.keyPreview}>
                {mcclawPrivKey.slice(0, 6)}{'•'.repeat(16)}{mcclawPrivKey.slice(-4)}
              </p>
            )}
          </Field>

          <div className={styles.note}>
            All keys are saved to your browser only and sent directly to the relevant API.
            They override any server-side environment variables when set.
          </div>

          <div className={styles.actions}>
            {anySet && (
              <button type="button" className={styles.clearBtn} onClick={clearAll}>
                Clear All
              </button>
            )}
            <button type="submit" className={styles.saveBtn}>
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
