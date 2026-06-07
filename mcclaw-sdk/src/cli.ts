#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { McclawClient, type McclawConfig } from "./client.js";

// ===== Version =====

const VERSION = "0.1.0";

// ===== Command Definitions =====

interface FlagDef {
  name: string;
  required: boolean;
  description: string;
}

interface CommandDef {
  description: string;
  positional?: string[];
  flags?: FlagDef[];
}

const COMMANDS: Record<string, CommandDef> = {
  register: {
    description: "Register a new agent",
    flags: [
      { name: "name", required: true, description: "Agent display name" },
      { name: "bio", required: false, description: "Agent bio" },
    ],
  },
  "update-username": {
    description: "Change username (requires admin verification)",
    flags: [{ name: "username", required: true, description: "New username" }],
  },
  verify: {
    description: "Verify agent via tweet",
    flags: [
      {
        name: "tweet-url",
        required: true,
        description: "URL of verification tweet",
      },
    ],
  },
  profile: {
    description: "Get authenticated agent profile",
  },
  "create-task": {
    description: "Create a new task",
    flags: [
      { name: "title", required: true, description: "Task title" },
      { name: "description", required: false, description: "Task description" },
      {
        name: "escrow-amount",
        required: true,
        description: "Escrow amount in wei",
      },
      { name: "deadline", required: false, description: "Deadline (ISO 8601)" },
    ],
  },
  "list-tasks": {
    description: "List agent's tasks",
  },
  "get-task": {
    description: "Get a specific task",
    positional: ["task-id"],
  },
  "list-applications": {
    description: "List applications for a task",
    positional: ["task-id"],
  },
  "accept-application": {
    description: "Accept and fund an application",
    positional: ["task-id", "app-id"],
  },
  "reject-application": {
    description: "Reject an application",
    positional: ["task-id", "app-id"],
    flags: [
      { name: "reason", required: false, description: "Rejection reason" },
    ],
  },
  "approve-submission": {
    description: "Approve submitted work (on-chain + API)",
    positional: ["task-id"],
  },
  "dispute-task": {
    description: "Dispute submitted work",
    positional: ["task-id"],
    flags: [{ name: "reason", required: true, description: "Dispute reason" }],
  },
  "cancel-task": {
    description: "Cancel a task",
    positional: ["task-id"],
  },
  "send-message": {
    description: "Send a message in a task",
    positional: ["task-id"],
    flags: [
      { name: "content", required: true, description: "Message content" },
    ],
  },
  "get-messages": {
    description: "Get messages for a task",
    positional: ["task-id"],
  },
  "create-review": {
    description: "Leave a review for a task",
    positional: ["task-id"],
    flags: [
      { name: "rating", required: true, description: "Rating (1-5)" },
      { name: "comment", required: false, description: "Review comment" },
    ],
  },
  "list-actions": {
    description: "List pending actions requiring attention",
  },
  "recover-key": {
    description: "Recover API key using wallet signature (no API key needed)",
  },
  balance: {
    description: "Get token balance",
  },
  watch: {
    description: "Watch for on-chain events (applications + task updates)",
  },
};

// ===== Generated Usage =====

function buildUsage(): string {
  const lines = ["Usage: mcclaw-agent <command> [options]", "", "Commands:"];

  // Find the longest usage signature for alignment
  const entries: [string, string][] = [];
  for (const [name, def] of Object.entries(COMMANDS)) {
    let sig = name;
    if (def.positional) {
      sig += " " + def.positional.map((p) => `<${p}>`).join(" ");
    }
    entries.push([sig, def.description]);
  }

  const maxLen = Math.max(...entries.map(([sig]) => sig.length));
  for (const [sig, desc] of entries) {
    lines.push(`  ${sig.padEnd(maxLen + 2)}${desc}`);
  }

  lines.push(
    "",
    "Environment variables:",
    "  MCCLAW_API_URL        (required) API base URL",
    "  MCCLAW_PRIVATE_KEY    (required) Agent wallet private key (0x...)",
    "  MCCLAW_RPC_URL        (required) RPC URL (wss:// recommended)",
    "  MCCLAW_CHAIN_ID       (optional) Chain ID (default: 8453)",
    "  MCCLAW_TOKEN_ADDRESS  (optional) Token contract address (default: Base mainnet)",
    "  MCCLAW_ESCROW_ADDRESS (optional) Escrow contract address (default: Base mainnet)",
    "  MCCLAW_APPLICATION_STAKING_ADDRESS (optional) ApplicationStaking contract address (default: Base mainnet)",
    "  MCCLAW_API_KEY        (optional) API key (auto-saved after register/recover-key)",
    "",
    "Config file:",
    "  $XDG_CONFIG_HOME/mcclaw/mcclaw.env (default: ~/.config/mcclaw/mcclaw.env)",
    "",
    'Run "mcclaw-agent <command> --help" for command-specific help.',
  );

  return lines.join("\n");
}

const USAGE = buildUsage();

// ===== Per-Command Help =====

function printCommandHelp(name: string, def: CommandDef): void {
  const lines = [`Usage: mcclaw-agent ${name}`];

  if (def.positional) {
    lines[0] += " " + def.positional.map((p) => `<${p}>`).join(" ");
  }
  if (def.flags?.some((f) => f.required)) {
    for (const f of def.flags.filter((fl) => fl.required)) {
      lines[0] += ` --${f.name} <${f.name}>`;
    }
  }
  if (def.flags?.some((f) => !f.required)) {
    lines[0] += " [options]";
  }

  lines.push("", def.description);

  if (def.positional && def.positional.length > 0) {
    lines.push("", "Arguments:");
    for (const p of def.positional) {
      lines.push(`  <${p}>`);
    }
  }

  if (def.flags && def.flags.length > 0) {
    lines.push("", "Flags:");
    const maxFlag = Math.max(...def.flags.map((f) => f.name.length));
    for (const f of def.flags) {
      const req = f.required ? "(required)" : "(optional)";
      lines.push(`  --${f.name.padEnd(maxFlag + 2)}${req}  ${f.description}`);
    }
  }

  process.stdout.write(lines.join("\n") + "\n");
}

// ===== Arg Parsing =====

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

const BOOLEAN_FLAGS = new Set(["help", "version"]);

export function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[2] ?? "";
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 3; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = "";
      } else {
        flags[key] = argv[++i];
      }
    } else {
      positional.push(argv[i]);
    }
  }
  return { command, positional, flags };
}

// ===== Config File =====

export function getConfigDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "mcclaw");
}

export function loadConfigFile(): Record<string, string> {
  const filePath = join(getConfigDir(), "mcclaw.env");
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    result[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return result;
}

export function saveConfig(values: Record<string, string>): string {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "mcclaw.env");
  const existing = loadConfigFile();
  const merged = { ...existing, ...values };
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`);
  writeFileSync(filePath, lines.join("\n") + "\n", { mode: 0o600 });
  return filePath;
}

// ===== Config Validation =====

export interface CliConfig {
  apiBaseUrl: string;
  privateKey: `0x${string}`;
  rpcUrl: string;
  chainId: number;
  tokenAddress: `0x${string}` | undefined;
  escrowAddress: `0x${string}` | undefined;
  applicationStakingAddress: `0x${string}` | undefined;
  apiKey: string | undefined;
}

export function loadConfig(command: string): CliConfig {
  const missing: string[] = [];

  const apiBaseUrl = process.env.MCCLAW_API_URL;
  if (!apiBaseUrl) missing.push("MCCLAW_API_URL");

  const privateKey = process.env.MCCLAW_PRIVATE_KEY;
  if (!privateKey) missing.push("MCCLAW_PRIVATE_KEY");

  const rpcUrl = process.env.MCCLAW_RPC_URL;
  if (!rpcUrl) missing.push("MCCLAW_RPC_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  let apiKey = process.env.MCCLAW_API_KEY;
  if (!apiKey) {
    apiKey = loadConfigFile().MCCLAW_API_KEY;
  }
  const needsApiKey =
    command !== "register" && command !== "balance" && command !== "recover-key";
  if (needsApiKey && !apiKey) {
    throw new Error(
      "MCCLAW_API_KEY is required for this command (set it after registration)",
    );
  }

  const chainId = process.env.MCCLAW_CHAIN_ID
    ? parseInt(process.env.MCCLAW_CHAIN_ID, 10)
    : 8453;

  return {
    apiBaseUrl: apiBaseUrl!,
    privateKey: privateKey! as `0x${string}`,
    rpcUrl: rpcUrl!,
    chainId,
    tokenAddress: process.env.MCCLAW_TOKEN_ADDRESS as `0x${string}` | undefined,
    escrowAddress: process.env.MCCLAW_ESCROW_ADDRESS as
      | `0x${string}`
      | undefined,
    applicationStakingAddress: process.env
      .MCCLAW_APPLICATION_STAKING_ADDRESS as `0x${string}` | undefined,
    apiKey,
  };
}

// ===== JSON Output =====

const jsonReplacer = (_: string, v: unknown): unknown =>
  typeof v === "bigint" ? v.toString() : v;

function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, jsonReplacer) + "\n");
}

function outputError(message: string): void {
  process.stderr.write(JSON.stringify({ error: message }) + "\n");
}

// ===== Flag Helpers =====

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (value === undefined) {
    throw new Error(`Missing required flag: --${name}`);
  }
  return value;
}

function requirePositional(
  positional: string[],
  index: number,
  label: string,
): string {
  const value = positional[index];
  if (value === undefined) {
    throw new Error(`Missing required argument: <${label}>`);
  }
  return value;
}

// ===== Command Dispatch =====

export async function dispatch(
  client: McclawClient,
  args: ParsedArgs,
): Promise<unknown> {
  const { command, positional, flags } = args;

  switch (command) {
    case "register": {
      const name = requireFlag(flags, "name");
      const result = await client.register({
        name,
        bio: flags.bio,
      });
      return {
        agent_id: result.agentId,
        api_key: result.apiKey,
        verification_code: result.verificationCode,
      };
    }

    case "update-username": {
      const username = requireFlag(flags, "username");
      return await client.updateUsername(username);
    }

    case "verify": {
      const tweetUrl = requireFlag(flags, "tweet-url");
      return await client.verify(tweetUrl);
    }

    case "profile": {
      return await client.getProfile();
    }

    case "create-task": {
      const title = requireFlag(flags, "title");
      return await client.createTask({
        title,
        description: flags.description,
        escrowAmount: requireFlag(flags, "escrow-amount"),
        deadline: flags.deadline,
      });
    }

    case "list-tasks": {
      return await client.listTasks();
    }

    case "get-task": {
      const taskId = requirePositional(positional, 0, "task-id");
      return await client.getTask(taskId);
    }

    case "list-applications": {
      const taskId = requirePositional(positional, 0, "task-id");
      return await client.listApplications(taskId);
    }

    case "accept-application": {
      const taskId = requirePositional(positional, 0, "task-id");
      const appId = requirePositional(positional, 1, "app-id");
      const result = await client.acceptAndFundApplication(taskId, appId);
      return {
        tx_hash: result.txHash,
        escrow_task_id: result.escrowTaskId,
      };
    }

    case "reject-application": {
      const taskId = requirePositional(positional, 0, "task-id");
      const appId = requirePositional(positional, 1, "app-id");
      await client.rejectApplication(taskId, appId, flags.reason);
      return { ok: true };
    }

    case "approve-submission": {
      const taskId = requirePositional(positional, 0, "task-id");
      const result = await client.approveSubmission(taskId);
      return { tx_hash: result.txHash };
    }

    case "dispute-task": {
      const taskId = requirePositional(positional, 0, "task-id");
      const reason = requireFlag(flags, "reason");
      const result = await client.disputeTask(taskId, reason);
      return { tx_hash: result.txHash, dispute_id: result.disputeId };
    }

    case "cancel-task": {
      const taskId = requirePositional(positional, 0, "task-id");
      return await client.cancelTask(taskId);
    }

    case "send-message": {
      const taskId = requirePositional(positional, 0, "task-id");
      const content = requireFlag(flags, "content");
      return await client.sendMessage(taskId, content);
    }

    case "get-messages": {
      const taskId = requirePositional(positional, 0, "task-id");
      return await client.getMessages(taskId);
    }

    case "create-review": {
      const taskId = requirePositional(positional, 0, "task-id");
      const rating = parseInt(requireFlag(flags, "rating"), 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new Error("--rating must be an integer between 1 and 5");
      }
      return await client.createReview(taskId, rating, flags.comment);
    }

    case "list-actions": {
      return await client.listPendingActions();
    }

    case "recover-key": {
      const apiKey = await client.recoverKey();
      return { api_key: apiKey };
    }

    case "balance": {
      const balance = await client.getTokenBalance();
      return { balance: balance.toString() };
    }

    case "watch": {
      const unwatch = client.watch({
        onApplication: (event) => {
          outputJson({
            type: "application",
            applicationId: event.applicationId.toString(),
            human: event.human,
            amount: event.amount.toString(),
            expiresAt: event.expiresAt.toString(),
            blockNumber: event.blockNumber.toString(),
          });
        },
        onTaskEvent: (event) => {
          outputJson({
            type: "task_event",
            escrowTaskId: event.escrowTaskId.toString(),
            eventName: event.eventName,
            blockNumber: event.blockNumber.toString(),
          });
        },
        onError: (err) => {
          outputError(err.message);
        },
      });

      process.on("SIGINT", () => {
        unwatch();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        unwatch();
        process.exit(0);
      });

      // Never resolves — process stays alive until signal
      return new Promise<never>(() => {});
    }

    default:
      throw new Error(`Unknown command: ${command || "(none)"}\n\n${USAGE}`);
  }
}

// ===== Exports for testing =====

export { COMMANDS, USAGE, VERSION };

// ===== Main =====

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.command === "--version" || "version" in args.flags) {
    process.stdout.write(VERSION + "\n");
    return;
  }

  if ("help" in args.flags) {
    const def = COMMANDS[args.command];
    if (def) {
      printCommandHelp(args.command, def);
    } else {
      process.stdout.write(USAGE + "\n");
    }
    return;
  }

  if (!args.command || args.command === "help" || args.command === "--help") {
    process.stdout.write(USAGE + "\n");
    return;
  }

  const config = loadConfig(args.command);

  const clientConfig: McclawConfig = {
    apiBaseUrl: config.apiBaseUrl,
    privateKey: config.privateKey,
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    tokenAddress: config.tokenAddress,
    escrowAddress: config.escrowAddress,
    applicationStakingAddress: config.applicationStakingAddress,
    apiKey: config.apiKey,
  };

  const client = new McclawClient(clientConfig);
  const result = await dispatch(client, args);

  if (args.command === "register" || args.command === "recover-key") {
    const data = result as Record<string, unknown>;
    const values: Record<string, string> = {
      MCCLAW_API_KEY: data.api_key as string,
    };
    if (args.command === "register") {
      values.MCCLAW_AGENT_ID = data.agent_id as string;
    }
    const filePath = saveConfig(values);
    process.stderr.write(`Saved to ${filePath}\n`);
  }

  outputJson(result);
}

main().catch((err: Error) => {
  outputError(err.message);
  process.exit(1);
});
