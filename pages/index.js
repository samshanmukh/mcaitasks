import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from '../styles/landing.module.css';

const NAV_LINKS = [
  { href: '/create',      label: 'Create Task' },
  { href: '/dashboard',   label: 'Dashboard'   },
  { href: '/feed',        label: 'Feed'         },
  { href: '/leaderboard', label: 'Leaderboard'  },
];

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.navBrand}>McAsk</Link>
        <div className={styles.navLinks}>
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={styles.navLink}>{l.label}</Link>
          ))}
          <Link href="/dashboard" className={styles.navCta}>Launch App →</Link>
        </div>
      </div>
    </nav>
  );
}

function Tag({ children }) {
  return <span className={styles.tag}>{children}</span>;
}

function Section({ id, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add(styles.visible); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section id={id} ref={ref} className={`${styles.section} ${styles.fadeSection} ${className}`}>
      <div className={styles.sectionInner}>{children}</div>
    </section>
  );
}

export default function Landing() {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  const heroTextRef = useRef(null);

  useEffect(() => {
    let raf;
    const onScroll = () => {
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (orb1Ref.current)    orb1Ref.current.style.transform    = `translateY(${y * 0.25}px)`;
        if (orb2Ref.current)    orb2Ref.current.style.transform    = `translateY(${y * 0.15}px)`;
        if (orb3Ref.current)    orb3Ref.current.style.transform    = `translateY(${y * 0.35}px)`;
        if (heroTextRef.current) heroTextRef.current.style.transform = `translateY(${y * 0.12}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        {/* Parallax orbs */}
        <div ref={orb1Ref} className={`${styles.orb} ${styles.orb1}`} />
        <div ref={orb2Ref} className={`${styles.orb} ${styles.orb2}`} />
        <div ref={orb3Ref} className={`${styles.orb} ${styles.orb3}`} />
        <div className={styles.gridOverlay} />

        <div ref={heroTextRef} className={styles.heroInner}>
          <Tag>McClaw Hackathon</Tag>
          <h1 className={styles.heroTitle}>McAsk</h1>
          <p className={styles.heroSub}>AI-Powered Agent Dashboard for McClaw</p>
          <p className={styles.heroDesc}>
            Autonomous AI agents can now delegate work to humans at scale.
            Generate professional task specifications in seconds and post
            directly to McClaw's blockchain.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/dashboard" className={styles.ctaPrimary}>Launch Dashboard →</Link>
            <Link href="/feed"      className={styles.ctaSecondary}>Browse Tasks</Link>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>~5s</span>
              <span className={styles.heroStatLabel}>Task spec generation</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>Base L2</span>
              <span className={styles.heroStatLabel}>Blockchain network</span>
            </div>
            <div className={styles.heroStatDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatNum}>MCLAW</span>
              <span className={styles.heroStatLabel}>Native token escrow</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem ───────────────────────────────────────────────────── */}
      <Section id="problem" className={styles.problemSection}>
        <Tag>The Problem</Tag>
        <h2 className={styles.sectionTitle}>
          AI agents plan. Humans execute.
          <br />
          <span className={styles.highlight}>The bridge is broken.</span>
        </h2>
        <div className={styles.problemGrid}>
          {[
            { n: '01', title: 'AI excels at planning',        body: 'Modern AI agents are excellent at strategy, decision-making, and defining complex workflows — but they can\'t physically act in the world.' },
            { n: '02', title: 'Spec writing is a bottleneck', body: 'Writing professional, verifiable task specifications is tedious, expensive, and slows down every autonomous pipeline that touches human labour.' },
            { n: '03', title: 'Cost at scale is prohibitive', body: 'At $1,500+ per manually-crafted task spec, scaling human task delegation to millions of AI-driven workflows is economically impossible.' },
          ].map(c => (
            <div key={c.n} className={styles.problemCard}>
              <span className={styles.cardNum}>{c.n}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Solution ──────────────────────────────────────────────────── */}
      <Section id="solution" className={styles.solutionSection}>
        <Tag>The Solution</Tag>
        <h2 className={styles.sectionTitle}>
          Describe it. AI writes it.
          <br />
          <span className={styles.highlight}>Blockchain enforces it.</span>
        </h2>
        <p className={styles.solutionDesc}>
          McAsk combines <strong>Claude AI</strong> with <strong>McClaw's decentralised work marketplace</strong>.
          Describe what you need. AI generates professional specs. Post directly to Base L2.
          Humans execute. System pays automatically.
        </p>
        <div className={styles.solutionPill}>
          Manual: ~$1,500 / task&nbsp;&nbsp;→&nbsp;&nbsp;
          <span className={styles.pillGold}>McAsk: 10 MCLAW / task</span>
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Real Challenges ───────────────────────────────────────────── */}
      <Section id="challenges" className={styles.challengeSection}>
        <Tag>Built From Real Problems</Tag>
        <h2 className={styles.sectionTitle}>
          Escrow finality on Base L2 —
          <br />
          <span className={styles.highlight}>a real gotcha we shipped around.</span>
        </h2>
        <p className={styles.solutionDesc}>
          While building McAsk, we hit a subtle race condition in McClaw's escrow
          mechanism that anyone building on top of it will eventually encounter.
        </p>

        <div className={styles.challengeGrid}>
          <div className={styles.challengeCard}>
            <div className={styles.challengeLabel}>The Problem</div>
            <h3>McClaw escrow lock has a finality delay</h3>
            <p>
              When a task is posted, the MCLAW escrow is submitted as a transaction to
              Base L2 — but it takes time to confirm on-chain. During that window,
              McClaw's balance check still sees the full balance as available. This means
              you can post a second task before the first escrow has settled, and both
              go through — overdrawing your wallet. The balance only hits zero after
              both transactions confirm, leaving future task creation failing with
              <code>Insufficient MCLAW balance</code>.
            </p>
            <div className={styles.codeBlock}>
              <div className={styles.codeLine}><span className={styles.codeComment}>// Post task 1 — escrow tx submitted, not yet confirmed</span></div>
              <div className={styles.codeLine}><span className={styles.codeComment}>// Balance check: still shows 10 MCLAW available</span></div>
              <div className={styles.codeLine}><span className={styles.codeRed}>!</span> Post task 2 — <span className={styles.codeVal}>overdraft</span> <span className={styles.codeComment}>// both tasks lock 10 MCLAW</span></div>
              <div className={styles.codeLine}><span className={styles.codeRed}>✗</span> Task 3 — <span className={styles.codeVal}>balance: 0</span> <span className={styles.codeComment}>// now correctly blocked</span></div>
            </div>
          </div>

          <div className={styles.challengeCard}>
            <div className={styles.challengeLabel}>How McAsk Solves It</div>
            <h3>Pre-flight on-chain balance check before every post</h3>
            <p>
              McAsk queries the agent wallet's live MCLAW balance directly from the
              Base L2 RPC node before calling Claude or the McClaw CLI. If the
              balance won't cover the escrow, the request is rejected immediately
              with a clear 402 response — no wasted API calls, no silent overdrafts,
              no surprise zero balance after posting.
            </p>
            <div className={styles.challengeSteps}>
              <div className={styles.challengeStep}>
                <span className={styles.challengeStepNum}>1</span>
                <span>Query live MCLAW balance from Base L2 RPC before anything else</span>
              </div>
              <div className={styles.challengeStep}>
                <span className={styles.challengeStepNum}>2</span>
                <span>Reject with 402 + exact balance vs. required amount if insufficient</span>
              </div>
              <div className={styles.challengeStep}>
                <span className={styles.challengeStepNum}>3</span>
                <span>Only proceed to Claude + CLI once balance is confirmed sufficient</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <Section id="how" className={styles.howSection}>
        <Tag>How It Works</Tag>
        <h2 className={styles.sectionTitle}>Three steps to delegation</h2>
        <div className={styles.steps}>
          {[
            { n: '01', title: 'Input',        body: 'Describe the work in plain English — a sentence or a paragraph. No formal spec required.' },
            { n: '02', title: 'Generate',     body: 'Claude Opus 4 transforms your description into a professional, verifiable task spec with acceptance criteria and time estimates.' },
            { n: '03', title: 'Post On-Chain', body: 'Task posted to McClaw via Base L2 with MCLAW token escrow. Humans apply, execute, and get paid automatically on approval.' },
          ].map((s, i, arr) => (
            <div key={s.n} className={styles.stepWrap}>
              <div className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.body}</p>
              </div>
              {i < arr.length - 1 && <div className={styles.stepArrow}>→</div>}
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Why McClaw ────────────────────────────────────────────────── */}
      <Section id="why" className={styles.whySection}>
        <Tag>Why McClaw</Tag>
        <h2 className={styles.sectionTitle}>Built on trustless infrastructure</h2>
        <div className={styles.whyGrid}>
          {[
            { title: 'Trustless Escrow',   body: 'MCLAW tokens are locked in a smart contract escrow until work is verified. No middlemen, no disputes — code enforces the contract.' },
            { title: 'Economic Model',     body: 'Scale from $1,500 manual spec cost down to 10 MCLAW automated cost. Every task creation is tracked, charted, and break-even analysed.' },
            { title: 'Auto-Verification',  body: 'AI agents can inspect submitted work against acceptance criteria and release escrow automatically — closing the human-in-the-loop at scale.' },
          ].map(w => (
            <div key={w.title} className={styles.whyCard}>
              <div className={styles.whyRule} />
              <h3>{w.title}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Features ──────────────────────────────────────────────────── */}
      <Section id="features" className={styles.featuresSection}>
        <Tag>Features</Tag>
        <h2 className={styles.sectionTitle}>Everything you need to delegate at scale</h2>
        <div className={styles.featureGrid}>
          {[
            { title: 'AI Task Generation', desc: 'Claude Opus 4 generates structured, professional task specs including description, acceptance criteria, time estimates, and instructions — in seconds.', badge: 'Core' },
            { title: 'Live Dashboard',     desc: 'Real-time task tracking via Server-Sent Events. See every application, status change, and lifecycle event as it happens on-chain.', badge: 'Realtime' },
            { title: 'Earnings Tracker',   desc: 'Chart MCLAW spent vs recovered over time. Break-even analysis, recovery rate, and net position — full economics visibility.', badge: 'Analytics' },
            { title: 'Task Timeline',      desc: 'Kanban-style board showing every task moving through new → funded → active → submitted → approved. Auto-refreshes every 15 seconds.', badge: 'Tracking' },
            { title: 'Worker Leaderboard', desc: 'On-chain reputation scores for top workers. Rank by tasks completed, applications submitted, and reputation — with Basescan links.', badge: 'Community' },
            { title: 'Social & Webhooks',  desc: 'Auto-tweet new tasks on X/Twitter, fire Slack and Discord webhooks on applications and completions. Pluggable and optional.', badge: 'Integrations' },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureBadge}>{f.badge}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Tech Stack ────────────────────────────────────────────────── */}
      <Section id="stack" className={styles.stackSection}>
        <Tag>Tech Stack</Tag>
        <h2 className={styles.sectionTitle}>Production-grade, modern infrastructure</h2>
        <div className={styles.stackGrid}>
          {[
            { layer: 'Frontend',    items: ['Next.js 14', 'React 18', 'Axios', 'Recharts'] },
            { layer: 'AI',         items: ['Claude Opus 4', 'Anthropic API', 'Structured JSON output'] },
            { layer: 'Blockchain', items: ['McClaw SDK', 'Base L2', 'MCLAW token escrow', 'wagmi v2 + viem'] },
            { layer: 'Realtime',   items: ['Server-Sent Events', 'mcclaw-agent watch', 'Slack & Discord webhooks'] },
            { layer: 'Deployment', items: ['Vercel', 'Node.js 20', 'Environment-based config'] },
          ].map(s => (
            <div key={s.layer} className={styles.stackCard}>
              <div className={styles.stackLayer}>{s.layer}</div>
              <ul className={styles.stackItems}>
                {s.items.map(item => (
                  <li key={item} className={styles.stackItem}>
                    <span className={styles.stackDot} />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <div className={styles.divider} />

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <Section className={styles.ctaSection}>
        <div className={styles.ctaBox}>
          <div className={styles.ctaGlow} />
          <Tag>Get Started</Tag>
          <h2 className={styles.ctaTitle}>Ready to automate?</h2>
          <p className={styles.ctaDesc}>
            Launch the dashboard, connect your wallet, and post your first
            AI-generated task to McClaw in under a minute.
          </p>
          <Link href="/dashboard" className={styles.ctaPrimary}>Go to Dashboard →</Link>
          <p className={styles.ctaNote}>Built for the McClaw Hackathon · Base L2 · Claude Opus 4</p>
        </div>
      </Section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>McAsk</span>
          <span className={styles.footerLinks}>
            <Link href="/create"      className={styles.footerLink}>Create Task</Link>
            <Link href="/dashboard"   className={styles.footerLink}>Dashboard</Link>
            <Link href="/feed"        className={styles.footerLink}>Feed</Link>
            <Link href="/leaderboard" className={styles.footerLink}>Leaderboard</Link>
            <Link href="/earnings"    className={styles.footerLink}>Earnings</Link>
            <Link href="/timeline"    className={styles.footerLink}>Timeline</Link>
          </span>
          <span className={styles.footerRight}>Built on Base L2 · McClaw</span>
        </div>
      </footer>
    </div>
  );
}
