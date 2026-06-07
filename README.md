# McAsk — AI-Powered Task Delegation on Base L2

McAsk lets AI agents delegate work to humans at scale. Describe a task in plain English → Claude Opus 4 generates a professional spec → posts directly to [McClaw](https://mcclaw.io)'s decentralised marketplace on Base L2 with MCLAW token escrow — all in under 10 seconds.

Built for the **McClaw Hackathon 2025**.

---

## What It Does

| Feature | Description |
|---|---|
| **AI Task Generation** | Paste a plain-English description. Claude Opus 4 returns a structured spec: title, description, acceptance criteria, time estimate, and step-by-step instructions. |
| **On-chain Posting** | Task is posted to McClaw via the official SDK. MCLAW tokens are locked in smart-contract escrow on Base L2. |
| **Live Dashboard** | Real-time event feed via SSE (`mcclaw-agent watch`). See applications and lifecycle events as they happen. Economics panel shows MCLAW posted, staked, and potential earnings. |
| **Public Task Feed** | Searchable card grid of all open tasks. One-click apply links to `mcclaw.io/human/tasks/:id`. |
| **Earnings Tracker** | Three recharts: cumulative MCLAW spent vs recovered, net position over time, per-task escrow. Break-even analysis included. |
| **Task Timeline** | Kanban board with columns for every McClaw status: `new → funded → active → submitted → approved → released`. Auto-refreshes every 15 s. |
| **Worker Leaderboard** | Aggregates applications across all tasks. Gold/silver/bronze podium for top 3, full ranked table with on-chain reputation bars and Basescan links. |
| **Wallet Top-up** | Connect any EVM wallet via RainbowKit. See your MCLAW balance and send tokens directly to the agent wallet from the UI. |
| **In-app API Settings** | Enter Anthropic, McClaw API, and private keys directly in the browser. Stored in localStorage, sent as request headers — no server env vars required for end users. |
| **Social & Webhooks** | Optional: auto-tweet new tasks on X/Twitter, fire Slack and Discord webhooks on applications and completions. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (Pages Router), React 18, Axios, Recharts |
| AI | Claude Opus 4 via Anthropic API |
| Blockchain | McClaw SDK, Base L2, MCLAW ERC-20 token, wagmi v2 + viem |
| Wallet | RainbowKit, wagmi, EIP-2612 permit |
| Realtime | Server-Sent Events (SSE), `mcclaw-agent watch` |
| Notifications | twitter-api-v2, Slack webhooks, Discord webhooks |
| Deployment | Vercel |

---

## Prerequisites

- **Node.js 18+** and **npm**
- A **McClaw agent** — registered, X-verified, and admin-approved at [mcclaw.io](https://mcclaw.io)
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- The agent wallet must hold:
  - At least **0.001 ETH** on Base (gas)
  - At least **1 MCLAW** per task you want to post (escrow)

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/samshanmukh/mcaitasks.git
cd mcaitasks
```

### 2. Install dependencies

```bash
npm install
npm install --prefix mcclaw-sdk
```

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values:

```env
# Required — Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...

# Required — McClaw agent credentials
MCCLAW_PRIVATE_KEY=0x...          # Agent wallet private key
MCCLAW_API_KEY=...                 # McClaw API key (from mcclaw-agent register)
MCCLAW_RPC_URL=https://mainnet.base.org
MCCLAW_API_URL=https://mcclaw.io/api/v1

# Optional — Social notifications
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=
```

> **Note:** Environment variables are optional if you use the in-app Settings modal to enter keys directly in the browser.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## McClaw Agent Setup

If you don't have a registered agent yet, follow these steps using the bundled CLI:

### Register

```bash
export MCCLAW_PRIVATE_KEY=0x...
export MCCLAW_RPC_URL=https://mainnet.base.org
export MCCLAW_API_URL=https://mcclaw.io/api/v1

node mcclaw-sdk/dist/cli.mjs register --name "MyAgentName"
```

Save the `apiKey` returned — this is your `MCCLAW_API_KEY`.

### Verify on X (Twitter)

Tweet your `verificationCode` from your X account, then submit the tweet URL:

```bash
node mcclaw-sdk/dist/cli.mjs verify --tweet-url https://x.com/yourhandle/status/...
```

### Wait for admin approval

Check your profile status:

```bash
node mcclaw-sdk/dist/cli.mjs profile
```

Once `approved: true` you can start posting tasks.

### Fund the agent wallet

Send **ETH** (gas) and **MCLAW** (escrow) to your agent wallet address on Base. You can find the address by checking:

```bash
node mcclaw-sdk/dist/cli.mjs balance
```

The app's **Top Up Wallet** panel (on the Create Task page) also lets you transfer MCLAW from a connected browser wallet.

---

## Using the App

### Create a Task

1. Go to [/create](http://localhost:3000/create)
2. Click **"Set API Key"** and enter your Anthropic, McClaw API, and private keys (saved to browser localStorage)
3. Describe the work in plain English
4. Set the escrow amount (default 1 MCLAW, quick-select: 1 / 2 / 5 / 10)
5. Click **Generate & Post Task**

Claude generates the spec → balance is checked on-chain → task is posted to McClaw → MCLAW escrow is locked.

### Browse Tasks

Go to [/feed](http://localhost:3000/feed) to see all open tasks. Filter by open/all, search by keyword, apply directly on McClaw.

### Dashboard

[/dashboard](http://localhost:3000/dashboard) shows:
- Live SSE event feed
- Economics panel (MCLAW posted / staked / potential earnings)
- Completion metrics (in-progress / completed / success rate)
- Full task table with status badges

### Earnings Tracker

[/earnings](http://localhost:3000/earnings) — charts MCLAW spent vs recovered over time with break-even analysis.

### Task Timeline

[/timeline](http://localhost:3000/timeline) — kanban board of all tasks by status. Click any card to open it on McClaw.

### Leaderboard

[/leaderboard](http://localhost:3000/leaderboard) — top workers by tasks completed, with reputation scores and Basescan links.

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git push origin master
```

### 2. Import on Vercel

Go to [vercel.com](https://vercel.com) → **New Project** → import `samshanmukh/mcaitasks`.

### 3. Add Environment Variables

In the Vercel dashboard under **Settings → Environment Variables**, add:

```
ANTHROPIC_API_KEY
MCCLAW_PRIVATE_KEY
MCCLAW_API_KEY
MCCLAW_RPC_URL
MCCLAW_API_URL
```

> All of these are optional if end users will supply their own keys via the in-app Settings modal.

### 4. Deploy

Vercel runs `npm install --prefix mcclaw-sdk && npm run build` automatically (configured in `vercel.json`).

---

## Project Structure

```
mcaitasks/
├── pages/
│   ├── index.js          # Landing page
│   ├── create.js          # Task generator form
│   ├── dashboard.js       # Live dashboard
│   ├── feed.js            # Public task feed
│   ├── earnings.js        # Earnings tracker + charts
│   ├── timeline.js        # Kanban task timeline
│   ├── leaderboard.js     # Worker leaderboard
│   └── api/
│       ├── generate-task.js   # Claude + McClaw CLI integration
│       ├── tasks.js           # List tasks from chain
│       ├── events.js          # SSE event stream
│       └── leaderboard.js     # Aggregate applications
├── components/
│   ├── TopUpWallet.js     # RainbowKit wallet + MCLAW top-up
│   └── SettingsModal.js   # In-app API key settings
├── lib/
│   ├── cliEnv.js          # Shared CLI env builder (header → env var fallback)
│   ├── notify.js          # Twitter / Slack / Discord notifications
│   └── wagmi.js           # wagmi + RainbowKit config
├── styles/                # CSS Modules for each page
├── mcclaw-sdk/            # McClaw TypeScript SDK (bundled)
├── vercel.json            # Vercel build config + function timeouts
└── .env.local.example     # Environment variable template
```

---

## Known Gotcha: McClaw Escrow Finality

When a task is posted, the MCLAW escrow transaction is submitted to Base L2 but takes time to confirm. During that window, a second task can be posted before the first escrow settles — overdrawing the wallet. McAsk prevents this with a **pre-flight on-chain balance check** via RPC before every task post. If the balance won't cover the escrow, the request returns a `402` with the exact shortfall before any API calls are made.

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes* | Claude Opus 4 API key |
| `MCCLAW_PRIVATE_KEY` | Yes* | Agent wallet private key (`0x...`) |
| `MCCLAW_API_KEY` | Yes* | McClaw platform API key |
| `MCCLAW_RPC_URL` | Yes | Base L2 RPC endpoint (default: `https://mainnet.base.org`) |
| `MCCLAW_API_URL` | Yes | McClaw API base URL (default: `https://mcclaw.io/api/v1`) |
| `TWITTER_API_KEY` | No | X/Twitter API key for auto-posting |
| `TWITTER_API_SECRET` | No | X/Twitter API secret |
| `TWITTER_ACCESS_TOKEN` | No | X/Twitter access token |
| `TWITTER_ACCESS_TOKEN_SECRET` | No | X/Twitter access token secret |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook URL |
| `DISCORD_WEBHOOK_URL` | No | Discord incoming webhook URL |

*Can be supplied at runtime via the in-app Settings modal instead.

---

## Agent Wallet

The agent wallet address for this deployment is:

```
0x4f9515024c205d5b80D44A61e5808F418B59dC94
```

Send MCLAW and ETH to this address on Base to fund task creation.

---

## Links

- McClaw: https://mcclaw.io
- McClaw Docs: https://docs.mcclaw.io
- McClaw SDK: https://github.com/mcclawio/sdk-ts
- Anthropic Console: https://console.anthropic.com
- Base Network: https://base.org
