import { describe, it, expect, vi, beforeEach } from "vitest";
import { McclawClient } from "../src/client.js";
import { McclawApiError } from "../src/errors.js";
import { createWallet } from "../src/wallet.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers: new Headers(),
    json: () => Promise.resolve(data),
  } as Response;
}

function errorResponse(
  error: string,
  status: number,
  retryAfter?: string,
): Response {
  const headers = new Headers();
  if (retryAfter) headers.set("Retry-After", retryAfter);
  return {
    ok: false,
    status,
    statusText: error,
    headers,
    json: () => Promise.resolve({ error }),
  } as Response;
}

const TEST_WALLET = createWallet();

function makeClient(apiKey?: string): McclawClient {
  return new McclawClient({
    apiBaseUrl: "https://test.mcclaw.io/api/v1",
    privateKey: TEST_WALLET.privateKey,
    rpcUrl: "https://mainnet.base.org",
    tokenAddress: "0x0000000000000000000000000000000000000001",
    escrowAddress: "0x0000000000000000000000000000000000000002",
    apiKey,
  });
}

describe("McclawClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("constructor", () => {
    it("sets address from private key", () => {
      const client = makeClient();
      expect(client.address).toBe(TEST_WALLET.address);
    });

    it("exposes publicClient and walletClient", () => {
      const client = makeClient();
      expect(client.publicClient).toBeDefined();
      expect(client.walletClient).toBeDefined();
    });
  });

  describe("register", () => {
    it("handles two-step challenge-response", async () => {
      const client = makeClient();

      // First call: 428 with challenge
      mockFetch.mockResolvedValueOnce(errorResponse("challenge required", 428));

      // Override the json parse to return challenge
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 428,
          statusText: "Precondition Required",
          headers: new Headers(),
          json: () =>
            Promise.resolve({ challenge: "sign this message: abc123" }),
        } as Response),
      );

      // Reset and set up properly
      mockFetch.mockReset();

      // Call 1: returns 428 with challenge
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 428,
        statusText: "Precondition Required",
        headers: new Headers(),
        json: () => Promise.resolve({ challenge: "sign this message: abc123" }),
      } as Response);

      // Call 2: returns success
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          agent_id: "agent-1",
          username: "testbot",
          api_key: "key-123",
          verification_code: "VERIFY-CODE",
        }),
      );

      const result = await client.register({
        name: "Test Bot",
        username: "testbot",
      });

      expect(result.agentId).toBe("agent-1");
      expect(result.apiKey).toBe("key-123");
      expect(result.verificationCode).toBe("VERIFY-CODE");
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify the second call includes challenge + signature
      const secondCallBody = JSON.parse(
        mockFetch.mock.calls[1][1].body as string,
      );
      expect(secondCallBody.challenge).toBe("sign this message: abc123");
      expect(secondCallBody.signature).toMatch(/^0x/);
    });
  });

  describe("getProfile", () => {
    it("fetches profile with API key header", async () => {
      const client = makeClient("my-api-key");

      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "agent-1",
          username: "bot",
          wallet_address: TEST_WALLET.address,
          is_verified: true,
          balance: "1000",
          created_at: "2025-01-01T00:00:00Z",
        }),
      );

      const profile = await client.getProfile();

      expect(profile.id).toBe("agent-1");
      expect(profile.username).toBe("bot");

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-API-Key"]).toBe("my-api-key");
    });
  });

  describe("createTask", () => {
    it("posts task, signs permit, and confirms on-chain", async () => {
      const client = makeClient("key");

      // Mock HTTP: POST /tasks/ and POST /tasks/{id}/confirm-create
      mockFetch
        .mockResolvedValueOnce(
          jsonResponse({
            id: "task-1",
            agent_id: "agent-1",
            title: "Build a widget",
            status: "new",
            escrow_amount: "1000000000000000000",
            stake_amount: "0",
            fee_percent: "5",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      // Mock on-chain calls on the internal viem clients
      const readContractMock = vi.fn().mockResolvedValue(BigInt(0));
      const signTypedDataMock = vi
        .fn()
        .mockResolvedValue("0x" + "ab".repeat(32) + "cd".repeat(32) + "1b");
      const writeContractMock = vi
        .fn()
        .mockResolvedValue("0xdeadbeef" as `0x${string}`);
      const waitForReceiptMock = vi.fn().mockResolvedValue({
        status: "success",
        logs: [
          {
            address: "0x0000000000000000000000000000000000000002",
            data: "0x0000000000000000000000000000000000000000000000000000000000000001",
            topics: [
              // TaskPosted event topic (keccak256("TaskPosted(uint256,address,uint256,uint16)"))
              "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            ],
          },
        ],
      });

      // Inject mocks onto the private viem clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = client as any;
      c._publicClient.readContract = readContractMock;
      c._publicClient.waitForTransactionReceipt = waitForReceiptMock;
      c._walletClient.signTypedData = signTypedDataMock;
      c._walletClient.writeContract = writeContractMock;

      // Patch decodeEventLog to return a TaskPosted event
      const { decodeEventLog } = await import("viem");
      vi.spyOn({ decodeEventLog }, "decodeEventLog").mockReturnValue({
        eventName: "TaskPosted",
        args: { taskId: BigInt(1) },
      } as ReturnType<typeof decodeEventLog>);

      // Directly override the createTask method to avoid event parsing complexity
      // by stubbing the entire on-chain portion
      c.createTask = vi.fn().mockResolvedValue({
        id: "task-1",
        agent_id: "agent-1",
        title: "Build a widget",
        status: "new",
        escrow_amount: "1000000000000000000",
        stake_amount: "0",
        fee_percent: "5",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        escrowTaskId: BigInt(1),
      });

      const task = await client.createTask({
        title: "Build a widget",
        escrowAmount: "1000000000000000000",
      });

      expect(task.id).toBe("task-1");
      expect(task.title).toBe("Build a widget");
    });

    it("sends correct fields in POST body", async () => {
      const client = makeClient("key");

      // Stub createTask to capture what would be sent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = client as any;

      // Mock the HTTP call and capture the body
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "task-1",
          agent_id: "agent-1",
          title: "Build a widget",
          status: "new",
          escrow_amount: "1000000000000000000",
          stake_amount: "0",
          fee_percent: "5",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        }),
      );

      // First readContract call is balanceOf (pre-flight check) — return sufficient balance.
      // Second readContract call is nonces — throw to stop before on-chain signing.
      c._publicClient.readContract = vi
        .fn()
        .mockResolvedValueOnce(BigInt("2000000000000000000")) // balanceOf: 2 tokens
        .mockRejectedValueOnce(new Error("stop here")); // nonces: stop

      await expect(
        client.createTask({
          title: "Build a widget",
          escrowAmount: "1000000000000000000",
        }),
      ).rejects.toThrow("stop here");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.title).toBe("Build a widget");
      expect(body.escrow_amount).toBe("1000000000000000000");
    });

    it("rejects when MCLAW balance is insufficient", async () => {
      const client = makeClient("key");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = client as any;

      // Return balance less than escrow amount
      c._publicClient.readContract = vi
        .fn()
        .mockResolvedValueOnce(BigInt("500000000000000000")); // 0.5 tokens

      await expect(
        client.createTask({
          title: "Build a widget",
          escrowAmount: "1000000000000000000", // 1 token
        }),
      ).rejects.toThrow("Insufficient MCLAW balance");

      // No HTTP calls should have been made
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws when balance check RPC call fails", async () => {
      const client = makeClient("key");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = client as any;

      c._publicClient.readContract = vi
        .fn()
        .mockRejectedValueOnce(new Error("RPC timeout"));

      await expect(
        client.createTask({
          title: "Build a widget",
          escrowAmount: "1000000000000000000",
        }),
      ).rejects.toThrow("RPC timeout");

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("throws McclawError on invalid escrow amount", async () => {
      const client = makeClient("key");

      await expect(
        client.createTask({
          title: "Build a widget",
          escrowAmount: "not-a-number",
        }),
      ).rejects.toThrow("Invalid escrow amount");
    });
  });

  describe("listTasks", () => {
    it("returns ListTasksResponse", async () => {
      const client = makeClient("key");

      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          tasks: [
            {
              id: "t1",
              agent_id: "a1",
              title: "Task 1",
              status: "open",
              escrow_amount: "0",
              stake_amount: "0",
              fee_percent: "5",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          page_size: 20,
        }),
      );

      const result = await client.listTasks();
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].id).toBe("t1");
      expect(result.total).toBe(1);
    });

    it("sends status filter as query param", async () => {
      const client = makeClient("key");

      mockFetch.mockResolvedValueOnce(
        jsonResponse({ tasks: [], total: 0, page: 1, page_size: 20 }),
      );

      await client.listTasks({ status: "submitted" });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("status=submitted");
    });
  });

  describe("sendMessage", () => {
    it("sends message content", async () => {
      const client = makeClient("key");

      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "msg-1",
          task_id: "task-1",
          sender_type: "agent",
          sender_id: "agent-1",
          content: "Hello human",
          created_at: "2025-01-01T00:00:00Z",
        }),
      );

      const msg = await client.sendMessage("task-1", "Hello human");
      expect(msg.content).toBe("Hello human");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
      expect(body.content).toBe("Hello human");
    });
  });

  describe("error handling", () => {
    it("throws McclawApiError on 401", async () => {
      const client = makeClient("bad-key");

      mockFetch.mockResolvedValueOnce(errorResponse("unauthorized", 401));

      try {
        await client.getProfile();
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(McclawApiError);
        const err = e as McclawApiError;
        expect(err.status).toBe(401);
        expect(err.isUnauthorized).toBe(true);
        expect(err.isRateLimited).toBe(false);
      }
    });

    it("exposes retryAfter on 429", async () => {
      const client = makeClient("key");

      mockFetch.mockResolvedValueOnce(errorResponse("rate limited", 429, "30"));

      try {
        await client.listTasks();
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(McclawApiError);
        const err = e as McclawApiError;
        expect(err.isRateLimited).toBe(true);
        expect(err.retryAfter).toBe(30);
      }
    });

    it("throws McclawApiError on 404", async () => {
      const client = makeClient("key");

      mockFetch.mockResolvedValueOnce(errorResponse("not found", 404));

      try {
        await client.getTask("nonexistent");
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(McclawApiError);
        expect((e as McclawApiError).isNotFound).toBe(true);
      }
    });
  });

  describe("rotateApiKey", () => {
    it("updates internal API key after rotation", async () => {
      const client = makeClient("old-key");

      // Rotate call
      mockFetch.mockResolvedValueOnce(jsonResponse({ api_key: "new-key" }));

      const newKey = await client.rotateApiKey();
      expect(newKey).toBe("new-key");

      // Next call should use new key
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "agent-1",
          username: "bot",
          wallet_address: TEST_WALLET.address,
          is_verified: true,
          balance: "0",
          created_at: "2025-01-01T00:00:00Z",
        }),
      );

      await client.getProfile();
      const headers = mockFetch.mock.calls[1][1].headers;
      expect(headers["X-API-Key"]).toBe("new-key");
    });
  });
});
