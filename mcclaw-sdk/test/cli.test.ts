import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  parseArgs,
  loadConfig,
  dispatch,
  getConfigDir,
  loadConfigFile,
  saveConfig,
  COMMANDS,
  USAGE,
  VERSION,
  type ParsedArgs,
} from "../src/cli.js";

// ===== parseArgs =====

describe("parseArgs", () => {
  it("parses command with no arguments", () => {
    const result = parseArgs(["node", "cli.js", "profile"]);
    expect(result.command).toBe("profile");
    expect(result.positional).toEqual([]);
    expect(result.flags).toEqual({});
  });

  it("parses positional arguments", () => {
    const result = parseArgs(["node", "cli.js", "get-task", "task-123"]);
    expect(result.command).toBe("get-task");
    expect(result.positional).toEqual(["task-123"]);
    expect(result.flags).toEqual({});
  });

  it("parses multiple positional arguments", () => {
    const result = parseArgs([
      "node",
      "cli.js",
      "accept-application",
      "task-1",
      "app-2",
    ]);
    expect(result.command).toBe("accept-application");
    expect(result.positional).toEqual(["task-1", "app-2"]);
  });

  it("parses flags", () => {
    const result = parseArgs([
      "node",
      "cli.js",
      "register",
      "--name",
      "DevAgent",
      "--username",
      "devagent",
    ]);
    expect(result.command).toBe("register");
    expect(result.flags).toEqual({ name: "DevAgent", username: "devagent" });
    expect(result.positional).toEqual([]);
  });

  it("parses mixed positional and flags", () => {
    const result = parseArgs([
      "node",
      "cli.js",
      "accept-application",
      "task-123",
      "app-456",
      "--reason",
      "good fit",
    ]);
    expect(result.command).toBe("accept-application");
    expect(result.positional).toEqual(["task-123", "app-456"]);
    expect(result.flags).toEqual({
      reason: "good fit",
    });
  });

  it("returns empty command when none given", () => {
    const result = parseArgs(["node", "cli.js"]);
    expect(result.command).toBe("");
  });

  it("handles flags with values containing spaces", () => {
    const result = parseArgs([
      "node",
      "cli.js",
      "register",
      "--name",
      "My Cool Agent",
      "--bio",
      "I do things",
    ]);
    expect(result.flags.name).toBe("My Cool Agent");
    expect(result.flags.bio).toBe("I do things");
  });

  it("parses --help as boolean flag without consuming next arg", () => {
    const result = parseArgs(["node", "cli.js", "register", "--help"]);
    expect(result.command).toBe("register");
    expect(result.flags.help).toBe("");
    expect(result.positional).toEqual([]);
  });

  it("parses --version as boolean flag", () => {
    const result = parseArgs(["node", "cli.js", "--version"]);
    expect(result.command).toBe("--version");
  });

  it("parses --help after other flags without consuming them", () => {
    const result = parseArgs([
      "node",
      "cli.js",
      "create-task",
      "--help",
      "--title",
      "foo",
    ]);
    expect(result.flags.help).toBe("");
    // --title should still be parsed normally
    expect(result.flags.title).toBe("foo");
  });
});

// ===== loadConfig =====

describe("loadConfig", () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tmpDir = mkdtempSync(join(tmpdir(), "mcclaw-test-"));
    process.env.XDG_CONFIG_HOME = tmpDir; // isolate from real config file
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const setAllEnvVars = () => {
    process.env.MCCLAW_API_URL = "http://localhost:8080/api/v1";
    process.env.MCCLAW_PRIVATE_KEY = "0xabc123";
    process.env.MCCLAW_RPC_URL = "http://localhost:8545";
    process.env.MCCLAW_TOKEN_ADDRESS =
      "0x0000000000000000000000000000000000000001";
    process.env.MCCLAW_ESCROW_ADDRESS =
      "0x0000000000000000000000000000000000000002";
    process.env.MCCLAW_API_KEY = "test-key";
  };

  it("loads all config from env vars", () => {
    setAllEnvVars();
    const config = loadConfig("profile");
    expect(config.apiBaseUrl).toBe("http://localhost:8080/api/v1");
    expect(config.privateKey).toBe("0xabc123");
    expect(config.rpcUrl).toBe("http://localhost:8545");
    expect(config.chainId).toBe(8453);
    expect(config.tokenAddress).toBe(
      "0x0000000000000000000000000000000000000001",
    );
    expect(config.escrowAddress).toBe(
      "0x0000000000000000000000000000000000000002",
    );
    expect(config.apiKey).toBe("test-key");
  });

  it("uses custom chain ID when set", () => {
    setAllEnvVars();
    process.env.MCCLAW_CHAIN_ID = "1337";
    const config = loadConfig("profile");
    expect(config.chainId).toBe(1337);
  });

  it("throws on missing required env vars", () => {
    expect(() => loadConfig("register")).toThrow(
      "Missing required environment variables: MCCLAW_API_URL, MCCLAW_PRIVATE_KEY, MCCLAW_RPC_URL",
    );
  });

  it("lists all missing vars in one error", () => {
    process.env.MCCLAW_API_URL = "http://localhost:8080/api/v1";
    expect(() => loadConfig("register")).toThrow(
      "MCCLAW_PRIVATE_KEY, MCCLAW_RPC_URL",
    );
  });

  it("does not require MCCLAW_API_KEY for register", () => {
    setAllEnvVars();
    delete process.env.MCCLAW_API_KEY;
    const config = loadConfig("register");
    expect(config.apiKey).toBeUndefined();
  });

  it("does not require MCCLAW_API_KEY for balance", () => {
    setAllEnvVars();
    delete process.env.MCCLAW_API_KEY;
    const config = loadConfig("balance");
    expect(config.apiKey).toBeUndefined();
  });

  it("requires MCCLAW_API_KEY for profile", () => {
    setAllEnvVars();
    delete process.env.MCCLAW_API_KEY;
    expect(() => loadConfig("profile")).toThrow(
      "MCCLAW_API_KEY is required for this command",
    );
  });

  it("requires MCCLAW_API_KEY for create-task", () => {
    setAllEnvVars();
    delete process.env.MCCLAW_API_KEY;
    expect(() => loadConfig("create-task")).toThrow(
      "MCCLAW_API_KEY is required for this command",
    );
  });
});

// ===== dispatch =====

describe("dispatch", () => {
  // Minimal mock of McclawClient — only stubs the methods dispatch calls
  function mockClient(overrides: Record<string, unknown> = {}) {
    return {
      register: vi.fn().mockResolvedValue({
        agentId: "agent-1",
        apiKey: "key-123",
        verificationCode: "VERIFY-ABC",
      }),
      verify: vi.fn().mockResolvedValue({ verified: true }),
      getProfile: vi.fn().mockResolvedValue({
        id: "agent-1",
        username: "bot",
        is_verified: true,
      }),
      createTask: vi.fn().mockResolvedValue({
        id: "task-1",
        title: "Test",
        status: "open",
      }),
      listTasks: vi.fn().mockResolvedValue([{ id: "t1" }, { id: "t2" }]),
      getTask: vi.fn().mockResolvedValue({ id: "task-1", title: "Test" }),
      listApplications: vi
        .fn()
        .mockResolvedValue([{ id: "app-1", status: "pending" }]),
      acceptAndFundApplication: vi.fn().mockResolvedValue({
        txHash: "0xabc",
        escrowTaskId: BigInt(42),
      }),
      rejectApplication: vi.fn().mockResolvedValue(undefined),
      approveSubmission: vi.fn().mockResolvedValue({ txHash: "0xdef" }),
      disputeTask: vi
        .fn()
        .mockResolvedValue({ txHash: "0x123", disputeId: "d-1" }),
      cancelTask: vi.fn().mockResolvedValue({ txHash: "0xcanceltx" }),
      sendMessage: vi.fn().mockResolvedValue({
        id: "msg-1",
        content: "hello",
      }),
      getMessages: vi
        .fn()
        .mockResolvedValue([{ id: "msg-1", content: "hello" }]),
      createReview: vi.fn().mockResolvedValue({ id: "rev-1", rating: 5 }),
      getTokenBalance: vi.fn().mockResolvedValue(BigInt("1500000000000000000")),
      ...overrides,
    } as never;
  }

  it("routes register and transforms output", async () => {
    const client = mockClient();
    const args: ParsedArgs = {
      command: "register",
      positional: [],
      flags: { name: "DevAgent", bio: "I code" },
    };
    const result = await dispatch(client, args);
    expect(result).toEqual({
      agent_id: "agent-1",
      api_key: "key-123",
      verification_code: "VERIFY-ABC",
    });
    expect(client.register).toHaveBeenCalledWith({
      name: "DevAgent",
      bio: "I code",
    });
  });

  it("routes verify with flag", async () => {
    const client = mockClient();
    const args: ParsedArgs = {
      command: "verify",
      positional: [],
      flags: { "tweet-url": "https://x.com/test/status/123" },
    };
    await dispatch(client, args);
    expect(client.verify).toHaveBeenCalledWith("https://x.com/test/status/123");
  });

  it("routes profile", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "profile",
      positional: [],
      flags: {},
    });
    expect(result).toEqual({
      id: "agent-1",
      username: "bot",
      is_verified: true,
    });
  });

  it("routes create-task with flags", async () => {
    const client = mockClient();
    const args: ParsedArgs = {
      command: "create-task",
      positional: [],
      flags: {
        title: "Build widget",
        description: "A fine widget",
        "escrow-amount": "1500000000000000000",
        deadline: "2025-12-31T00:00:00Z",
      },
    };
    await dispatch(client, args);
    expect(client.createTask).toHaveBeenCalledWith({
      title: "Build widget",
      description: "A fine widget",
      escrowAmount: "1500000000000000000",
      deadline: "2025-12-31T00:00:00Z",
    });
  });

  it("routes list-tasks", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "list-tasks",
      positional: [],
      flags: {},
    });
    expect(result).toEqual([{ id: "t1" }, { id: "t2" }]);
  });

  it("routes get-task", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "get-task",
      positional: ["task-1"],
      flags: {},
    });
    expect(client.getTask).toHaveBeenCalledWith("task-1");
  });

  it("routes list-applications", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "list-applications",
      positional: ["task-1"],
      flags: {},
    });
    expect(client.listApplications).toHaveBeenCalledWith("task-1");
  });

  it("routes accept-application and serializes bigint", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "accept-application",
      positional: ["task-1", "app-1"],
      flags: {},
    });
    expect(result).toEqual({
      tx_hash: "0xabc",
      escrow_task_id: BigInt(42),
    });
    expect(client.acceptAndFundApplication).toHaveBeenCalledWith(
      "task-1",
      "app-1",
    );
  });

  it("routes reject-application with optional reason", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "reject-application",
      positional: ["task-1", "app-2"],
      flags: { reason: "Not qualified" },
    });
    expect(client.rejectApplication).toHaveBeenCalledWith(
      "task-1",
      "app-2",
      "Not qualified",
    );
  });

  it("routes reject-application without reason", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "reject-application",
      positional: ["task-1", "app-2"],
      flags: {},
    });
    expect(client.rejectApplication).toHaveBeenCalledWith(
      "task-1",
      "app-2",
      undefined,
    );
  });

  it("routes approve-submission", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "approve-submission",
      positional: ["task-1"],
      flags: {},
    });
    expect(result).toEqual({ tx_hash: "0xdef" });
    expect(client.approveSubmission).toHaveBeenCalledWith("task-1");
  });

  it("routes dispute-task", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "dispute-task",
      positional: ["task-1"],
      flags: { reason: "Work not done" },
    });
    expect(result).toEqual({ tx_hash: "0x123", dispute_id: "d-1" });
  });

  it("routes cancel-task", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "cancel-task",
      positional: ["task-1"],
      flags: {},
    });
    expect(client.cancelTask).toHaveBeenCalledWith("task-1");
  });

  it("routes send-message", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "send-message",
      positional: ["task-1"],
      flags: { content: "Hello there" },
    });
    expect(client.sendMessage).toHaveBeenCalledWith("task-1", "Hello there");
  });

  it("routes get-messages", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "get-messages",
      positional: ["task-1"],
      flags: {},
    });
    expect(client.getMessages).toHaveBeenCalledWith("task-1");
  });

  it("routes create-review with rating", async () => {
    const client = mockClient();
    await dispatch(client, {
      command: "create-review",
      positional: ["task-1"],
      flags: { rating: "5", comment: "Great work" },
    });
    expect(client.createReview).toHaveBeenCalledWith("task-1", 5, "Great work");
  });

  it("rejects invalid rating", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "create-review",
        positional: ["task-1"],
        flags: { rating: "0" },
      }),
    ).rejects.toThrow("--rating must be an integer between 1 and 5");
  });

  it("rejects rating above 5", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "create-review",
        positional: ["task-1"],
        flags: { rating: "6" },
      }),
    ).rejects.toThrow("--rating must be an integer between 1 and 5");
  });

  it("rejects non-numeric rating", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "create-review",
        positional: ["task-1"],
        flags: { rating: "abc" },
      }),
    ).rejects.toThrow("--rating must be an integer between 1 and 5");
  });

  it("routes balance and converts bigint to string", async () => {
    const client = mockClient();
    const result = await dispatch(client, {
      command: "balance",
      positional: [],
      flags: {},
    });
    expect(result).toEqual({ balance: "1500000000000000000" });
  });

  it("throws on unknown command", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, { command: "foobar", positional: [], flags: {} }),
    ).rejects.toThrow("Unknown command: foobar");
  });

  it("throws on missing command", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, { command: "", positional: [], flags: {} }),
    ).rejects.toThrow("Unknown command: (none)");
  });

  it("throws on missing required flag", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "register",
        positional: [],
        flags: {},
      }),
    ).rejects.toThrow("Missing required flag: --name");
  });

  it("throws on missing required positional arg", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, { command: "get-task", positional: [], flags: {} }),
    ).rejects.toThrow("Missing required argument: <task-id>");
  });

  it("throws on missing second positional for accept-application", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "accept-application",
        positional: ["task-1"],
        flags: {},
      }),
    ).rejects.toThrow("Missing required argument: <app-id>");
  });

  it("throws when dispute-task missing --reason", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "dispute-task",
        positional: ["task-1"],
        flags: {},
      }),
    ).rejects.toThrow("Missing required flag: --reason");
  });

  it("throws when send-message missing --content", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "send-message",
        positional: ["task-1"],
        flags: {},
      }),
    ).rejects.toThrow("Missing required flag: --content");
  });

  it("throws when create-review missing --rating", async () => {
    const client = mockClient();
    await expect(
      dispatch(client, {
        command: "create-review",
        positional: ["task-1"],
        flags: {},
      }),
    ).rejects.toThrow("Missing required flag: --rating");
  });
});

// ===== Config File =====

describe("getConfigDir", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses XDG_CONFIG_HOME when set", () => {
    process.env.XDG_CONFIG_HOME = "/custom/config";
    expect(getConfigDir()).toBe("/custom/config/mcclaw");
  });

  it("defaults to ~/.config when XDG_CONFIG_HOME is unset", () => {
    delete process.env.XDG_CONFIG_HOME;
    const dir = getConfigDir();
    expect(dir).toMatch(/\/\.config\/mcclaw$/);
  });
});

describe("loadConfigFile", () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tmpDir = mkdtempSync(join(tmpdir(), "mcclaw-test-"));
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty object when file does not exist", () => {
    expect(loadConfigFile()).toEqual({});
  });

  it("parses KEY=VALUE lines", () => {
    const dir = join(tmpDir, "mcclaw");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mcclaw.env"),
      "MCCLAW_API_KEY=abc123\nMCCLAW_AGENT_ID=agent-1\n",
    );
    expect(loadConfigFile()).toEqual({
      MCCLAW_API_KEY: "abc123",
      MCCLAW_AGENT_ID: "agent-1",
    });
  });

  it("skips blank lines and comments", () => {
    const dir = join(tmpDir, "mcclaw");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "mcclaw.env"),
      "# comment\n\nMCCLAW_API_KEY=key1\n\n# another\n",
    );
    expect(loadConfigFile()).toEqual({ MCCLAW_API_KEY: "key1" });
  });

  it("handles values containing =", () => {
    const dir = join(tmpDir, "mcclaw");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "mcclaw.env"), "FOO=bar=baz\n");
    expect(loadConfigFile()).toEqual({ FOO: "bar=baz" });
  });
});

describe("saveConfig", () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tmpDir = mkdtempSync(join(tmpdir(), "mcclaw-test-"));
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates directory and writes file", () => {
    const path = saveConfig({ MCCLAW_API_KEY: "secret" });
    expect(path).toBe(join(tmpDir, "mcclaw", "mcclaw.env"));
    const content = readFileSync(path, "utf-8");
    expect(content).toBe("MCCLAW_API_KEY=secret\n");
  });

  it("sets file mode to 0o600", () => {
    const path = saveConfig({ MCCLAW_API_KEY: "secret" });
    const stat = statSync(path);
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("merges with existing values", () => {
    saveConfig({ MCCLAW_API_KEY: "key1", MCCLAW_AGENT_ID: "agent-1" });
    saveConfig({ MCCLAW_API_KEY: "key2" });
    const result = loadConfigFile();
    expect(result).toEqual({
      MCCLAW_API_KEY: "key2",
      MCCLAW_AGENT_ID: "agent-1",
    });
  });
});

describe("loadConfig with config file fallback", () => {
  const originalEnv = process.env;
  let tmpDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    tmpDir = mkdtempSync(join(tmpdir(), "mcclaw-test-"));
    process.env.XDG_CONFIG_HOME = tmpDir;
    process.env.MCCLAW_API_URL = "http://localhost:8080/api/v1";
    process.env.MCCLAW_PRIVATE_KEY = "0xabc123";
    process.env.MCCLAW_RPC_URL = "http://localhost:8545";
  });

  afterEach(() => {
    process.env = originalEnv;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads API key from config file when env var is unset", () => {
    delete process.env.MCCLAW_API_KEY;
    saveConfig({ MCCLAW_API_KEY: "file-key" });
    const config = loadConfig("profile");
    expect(config.apiKey).toBe("file-key");
  });

  it("env var takes precedence over config file", () => {
    process.env.MCCLAW_API_KEY = "env-key";
    saveConfig({ MCCLAW_API_KEY: "file-key" });
    const config = loadConfig("profile");
    expect(config.apiKey).toBe("env-key");
  });

  it("still throws when API key is missing from both sources", () => {
    delete process.env.MCCLAW_API_KEY;
    expect(() => loadConfig("profile")).toThrow(
      "MCCLAW_API_KEY is required for this command",
    );
  });
});

// ===== COMMANDS metadata =====

describe("COMMANDS", () => {
  const dispatchCommands = [
    "register",
    "update-username",
    "verify",
    "profile",
    "create-task",
    "list-tasks",
    "get-task",
    "list-applications",
    "accept-application",
    "reject-application",
    "approve-submission",
    "dispute-task",
    "cancel-task",
    "send-message",
    "get-messages",
    "create-review",
    "list-actions",
    "recover-key",
    "balance",
    "watch",
  ];

  it("has an entry for every dispatch command", () => {
    for (const cmd of dispatchCommands) {
      expect(COMMANDS[cmd]).toBeDefined();
    }
  });

  it("has no entries for non-existent commands", () => {
    for (const name of Object.keys(COMMANDS)) {
      expect(dispatchCommands).toContain(name);
    }
  });

  it("every entry has a description", () => {
    for (const [name, def] of Object.entries(COMMANDS)) {
      expect(def.description).toBeTruthy();
    }
  });
});

// ===== USAGE =====

describe("USAGE", () => {
  it("mentions every command", () => {
    for (const name of Object.keys(COMMANDS)) {
      expect(USAGE).toContain(name);
    }
  });

  it("includes per-command help hint", () => {
    expect(USAGE).toContain("mcclaw-agent <command> --help");
  });
});

// ===== VERSION =====

describe("VERSION", () => {
  it("is a semver string", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ===== JSON bigint serialization =====

describe("JSON bigint serialization", () => {
  it("serializes bigint values as strings", () => {
    const replacer = (_: string, v: unknown): unknown =>
      typeof v === "bigint" ? v.toString() : v;
    const data = { tx_hash: "0xabc", escrow_task_id: BigInt(42) };
    const json = JSON.stringify(data, replacer);
    expect(JSON.parse(json)).toEqual({
      tx_hash: "0xabc",
      escrow_task_id: "42",
    });
  });

  it("handles nested bigint values", () => {
    const replacer = (_: string, v: unknown): unknown =>
      typeof v === "bigint" ? v.toString() : v;
    const data = {
      balance: BigInt("1500000000000000000"),
      nested: { amount: BigInt(100) },
    };
    const json = JSON.stringify(data, replacer);
    expect(JSON.parse(json)).toEqual({
      balance: "1500000000000000000",
      nested: { amount: "100" },
    });
  });
});
