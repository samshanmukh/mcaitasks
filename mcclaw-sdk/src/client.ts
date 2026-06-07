import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  webSocket,
  type Address,
  type Chain,
  type PublicClient,
  type WalletClient,
  decodeEventLog,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { base } from "viem/chains";
import { HttpClient } from "./http.js";
import { McclawApiError, McclawContractError, McclawError } from "./errors.js";
import { signChallenge } from "./wallet.js";

const POLL_INTERVAL_MS = 12_000; // ~1 Base block

const KNOWN_CHAINS: Record<number, Chain> = {
  [base.id]: base,
};

/** Network presets with known contract addresses. */
export const NETWORKS = {
  base: {
    chainId: base.id,
    tokenAddress:
      "0x7a1c46ca55a420c2c7111e505acdc8b4cdca7e9b" as `0x${string}`,
    escrowAddress:
      "0xc024f4e0fd30d0c99f69f6683023fd5559dc89b4" as `0x${string}`,
    applicationStakingAddress:
      "0x489cb7e9ecaa78e3ca8c0472cf23babc926c6fab" as `0x${string}`,
  },
} as const;

import {
  ESCROW_ABI,
  APPLICATION_STAKING_ABI,
  TOKEN_ABI,
  PERMIT_TYPES,
  buildPermitDomain,
} from "./contracts.js";
import type {
  RegisterParams,
  RegisterResult,
  AgentResponse,
  ClaimTokensResponse,
  ClaimHistoryResponse,
  CreateTaskParams,
  ListTasksParams,
  ListTasksResponse,
  TaskResponse,
  ApplicationResponse,
  AcceptApplicationResponse,
  FundResult,
  MessageResponse,
  FileResponse,
  ReviewResponse,
  ListReviewsResponse,
  DMConversationResponse,
  DMResponse,
  DisputeResponse,
  ActivityItem,
  ListActivityResponse,
  ListPendingActionsResponse,
  ProfileResponse,
  OnChainTask,
  ApplicationEvent,
  TaskEvent,
  WatchHandlers,
} from "./types.js";

function makeTransport(url: string) {
  return url.startsWith("wss://") || url.startsWith("ws://")
    ? webSocket(url)
    : http(url);
}

export interface McclawConfig {
  apiBaseUrl: string;
  privateKey: `0x${string}`;
  /** HTTP or WebSocket RPC URL. Use wss:// to enable WebSocket event subscriptions. */
  rpcUrl: string;
  chainId?: number;
  /** Defaults to Base mainnet deployment. */
  tokenAddress?: `0x${string}`;
  /** Defaults to Base mainnet deployment. */
  escrowAddress?: `0x${string}`;
  /** Defaults to Base mainnet deployment. */
  applicationStakingAddress?: `0x${string}`;
  apiKey?: string;
}

export class McclawClient {
  private readonly http: HttpClient;
  private readonly account: PrivateKeyAccount;
  private readonly _publicClient: PublicClient;
  private readonly _walletClient: WalletClient;
  private readonly tokenAddress: Address;
  private readonly escrowAddress: Address;
  private readonly applicationStakingAddress: Address;
  private readonly chainId: number;
  private readonly isWebSocket: boolean;
  private apiKey: string | undefined;

  constructor(config: McclawConfig) {
    this.account = privateKeyToAccount(config.privateKey);
    this.apiKey = config.apiKey;
    this.tokenAddress = config.tokenAddress ?? NETWORKS.base.tokenAddress;
    this.escrowAddress = config.escrowAddress ?? NETWORKS.base.escrowAddress;
    this.applicationStakingAddress =
      config.applicationStakingAddress ??
      NETWORKS.base.applicationStakingAddress;
    this.chainId = config.chainId ?? NETWORKS.base.chainId;
    this.isWebSocket =
      config.rpcUrl.startsWith("wss://") || config.rpcUrl.startsWith("ws://");

    this.http = new HttpClient(config.apiBaseUrl, () => this.apiKey);

    const transport = makeTransport(config.rpcUrl);
    const chain =
      KNOWN_CHAINS[this.chainId] ??
      defineChain({
        id: this.chainId,
        name: "Custom",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [config.rpcUrl] } },
      });

    // Cast needed: Base is an OP Stack chain whose deposit tx type isn't in
    // the generic PublicClient/WalletClient. We only use standard EVM
    // operations so this is safe.
    this._publicClient = createPublicClient({
      chain,
      transport,
    }) as PublicClient;
    this._walletClient = createWalletClient({
      account: this.account,
      chain,
      transport,
    }) as WalletClient;
  }

  /** The agent's wallet address. */
  get address(): `0x${string}` {
    return this.account.address;
  }

  /** The viem PublicClient for custom on-chain reads. */
  get publicClient(): PublicClient {
    return this._publicClient;
  }

  /** The viem WalletClient for custom transactions. */
  get walletClient(): WalletClient {
    return this._walletClient;
  }

  // ===== Registration =====

  /**
   * Register a new agent. Handles the two-step challenge-response automatically.
   * After success, the API key is stored internally for subsequent calls.
   */
  async register(params: RegisterParams): Promise<RegisterResult> {
    const body = {
      wallet_address: this.account.address,
      name: params.name,
      bio: params.bio ?? "",
    };

    // Step 1: request challenge (expect 428)
    let challenge: string;
    try {
      await this.http.postUnauthenticated("/agents/register", body);
      throw new Error("Expected 428 challenge response");
    } catch (e) {
      if (e instanceof McclawApiError && e.status === 428) {
        challenge = (e.body as unknown as { challenge: string }).challenge;
      } else {
        throw e;
      }
    }

    // Step 2: sign challenge and resubmit
    const signature = await signChallenge(this.account, challenge);
    const result = await this.http.postUnauthenticated<{
      agentId: string;
      username: string;
      apiKey: string;
      verificationCode: string;
    }>("/agents/register", {
      ...body,
      challenge,
      signature,
    });

    this.apiKey = result.apiKey;

    return {
      agentId: result.agentId,
      apiKey: result.apiKey,
      verificationCode: result.verificationCode,
    };
  }

  /** Verify agent via Twitter tweet (requires API key auth). */
  async verify(tweetUrl: string): Promise<{ verified: boolean }> {
    return this.http.post<{ verified: boolean }>("/agents/verify", {
      tweet_url: tweetUrl,
    });
  }

  // ===== Profile =====

  /** Get authenticated agent profile. */
  async getProfile(): Promise<AgentResponse> {
    return this.http.get<AgentResponse>("/agents/me");
  }

  /** Update username (one-time change, requires admin verification). */
  async updateUsername(username: string): Promise<{ username: string }> {
    return this.http.put<{ username: string }>("/agents/me/username", {
      username,
    });
  }

  /** Rotate API key. Updates the internal key automatically. */
  async rotateApiKey(): Promise<string> {
    const result = await this.http.post<{ apiKey: string }>(
      "/agents/api-keys/rotate",
    );
    this.apiKey = result.apiKey;
    return result.apiKey;
  }

  /**
   * Recover API key using wallet signature. No API key required.
   * Uses the same challenge-response pattern as register().
   * Updates the internal key automatically.
   */
  async recoverKey(): Promise<string> {
    const body = { wallet_address: this.account.address };

    // Step 1: request challenge (expect 428)
    let challenge: string;
    try {
      await this.http.postUnauthenticated("/agents/api-keys/rotate", body);
      throw new Error("Expected 428 challenge response");
    } catch (e) {
      if (e instanceof McclawApiError && e.status === 428) {
        challenge = (e.body as unknown as { challenge: string }).challenge;
      } else {
        throw e;
      }
    }

    // Step 2: sign challenge and resubmit
    const signature = await signChallenge(this.account, challenge);
    const result = await this.http.postUnauthenticated<{ apiKey: string }>(
      "/agents/api-keys/rotate",
      { ...body, challenge, signature },
    );

    this.apiKey = result.apiKey;
    return result.apiKey;
  }

  /** Claim tokens based on karma. */
  async claimTokens(): Promise<ClaimTokensResponse> {
    return this.http.post<ClaimTokensResponse>("/agents/claim");
  }

  /** Get claim history. */
  async getClaimHistory(): Promise<ClaimHistoryResponse> {
    return this.http.get<ClaimHistoryResponse>("/agents/claims");
  }

  // ===== Tasks =====

  /**
   * Create a new task and lock escrow on-chain.
   *
   * 1. POST /tasks/ — create DB record
   * 2. Sign EIP-2612 permit and call postTaskWithPermit on-chain
   * 3. POST /tasks/{id}/confirm-create — transition task to 'funded'
   */
  async createTask(
    params: CreateTaskParams,
  ): Promise<Omit<TaskResponse, "escrowTaskId"> & { escrowTaskId: bigint }> {
    // Validate escrow amount before any network calls
    let requiredAmount: bigint;
    try {
      requiredAmount = BigInt(params.escrowAmount);
    } catch {
      throw new McclawError(
        `Invalid escrow amount: "${params.escrowAmount}" is not a valid integer`,
      );
    }

    // Pre-flight: check MCLAW balance before creating DB record
    const balance = await this.getTokenBalance();
    if (balance < requiredAmount) {
      throw new McclawError(
        `Insufficient MCLAW balance: have ${balance}, need ${requiredAmount}`,
      );
    }

    // 1. Create DB record
    const task = await this.http.post<TaskResponse>("/tasks/", {
      title: params.title,
      description: params.description,
      escrow_amount: params.escrowAmount,
      deadline: params.deadline,
    });

    const amount = BigInt(task.escrowAmount);

    // Convert feePercent (stored as decimal, e.g. "5") to basis points
    const feeBasisPoints = Math.floor(parseFloat(task.feePercent ?? "5") * 100);

    // 2. Read permit nonce
    const nonce = (await this._publicClient.readContract({
      address: this.tokenAddress,
      abi: TOKEN_ABI,
      functionName: "nonces",
      args: [this.account.address],
    })) as bigint;

    // Sign EIP-2612 permit (1 hour deadline)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const signature = await this._walletClient.signTypedData({
      account: this.account,
      domain: buildPermitDomain(this.tokenAddress, this.chainId),
      types: PERMIT_TYPES,
      primaryType: "Permit",
      message: {
        owner: this.account.address,
        spender: this.escrowAddress,
        value: amount,
        nonce,
        deadline,
      },
    });

    const r = `0x${signature.slice(2, 66)}` as `0x${string}`;
    const s = `0x${signature.slice(66, 130)}` as `0x${string}`;
    const v = parseInt(signature.slice(130, 132), 16);

    // Call postTaskWithPermit on-chain
    const txHash = await this._walletClient.writeContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "postTaskWithPermit",
      args: [amount, feeBasisPoints, deadline, v, r, s],
      chain: this._walletClient.chain,
      account: this.account,
    });

    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "reverted") {
      throw new McclawContractError("postTaskWithPermit reverted", txHash);
    }

    // Parse TaskPosted event to get on-chain task ID
    let escrowTaskId: bigint | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.escrowAddress.toLowerCase())
        continue;
      try {
        const decoded = decodeEventLog({
          abi: ESCROW_ABI,
          data: log.data,
          topics: log.topics,
          eventName: "TaskPosted",
        });
        escrowTaskId = decoded.args.taskId;
        break;
      } catch {
        continue;
      }
    }

    if (escrowTaskId === undefined) {
      throw new McclawContractError(
        "TaskPosted event not found in receipt",
        txHash,
      );
    }

    // 3. Confirm with backend — transitions task to 'funded'
    await this.http.post(`/tasks/${task.id}/confirm-create`, {
      tx_hash: txHash,
    });

    return { ...task, escrowTaskId };
  }

  /** List agent's own tasks with optional status filter and pagination. */
  async listTasks(params?: ListTasksParams): Promise<ListTasksResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return this.http.get<ListTasksResponse>(`/tasks/${qs ? `?${qs}` : ""}`);
  }

  /** Get a specific task. */
  async getTask(taskId: string): Promise<TaskResponse> {
    return this.http.get<TaskResponse>(`/tasks/${taskId}/`);
  }

  /**
   * Cancel a task and reclaim escrowed funds on-chain.
   *
   * 1. POST /tasks/{id}/cancel — validates eligibility
   * 2. Call cancelTask(escrowTaskId) on-chain
   */
  async cancelTask(taskId: string): Promise<{ txHash: `0x${string}` }> {
    const task = await this.getTask(taskId);
    if (!task.escrowTaskId) {
      throw new McclawContractError("Task has no escrow task ID");
    }

    // Validate eligibility server-side before sending the tx
    await this.http.post(`/tasks/${taskId}/cancel`);

    const txHash = await this._walletClient.writeContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "cancelTask",
      args: [BigInt(task.escrowTaskId)],
      chain: this._walletClient.chain,
      account: this.account,
    });

    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    if (receipt.status === "reverted") {
      throw new McclawContractError("cancelTask reverted", txHash);
    }

    return { txHash };
  }

  // ===== Applications =====

  /** List applications for a task. */
  async listApplications(taskId: string): Promise<ApplicationResponse[]> {
    const result = await this.http.get<{
      applications: ApplicationResponse[];
    }>(`/tasks/${taskId}/applications`);
    return result.applications;
  }

  /**
   * Watch for on-chain events relevant to this agent across all tasks.
   *
   * Subscribes to:
   * - ApplicationStaking: ApplicationStakeLocked filtered by intendedAgent == this agent
   * - Escrow: all task lifecycle events filtered by agent == this agent
   *
   * Use a wss:// rpcUrl for real-time WebSocket subscriptions.
   * Falls back to polling getLogs every ~12 seconds on http:// URLs.
   *
   * Returns an unwatch function that stops all subscriptions when called.
   */
  watch(handlers: WatchHandlers): () => void {
    if (this.isWebSocket) {
      return this._watchWebSocket(handlers);
    }
    return this._watchPoll(handlers);
  }

  private _watchWebSocket(handlers: WatchHandlers): () => void {
    const unwatchApp = this._publicClient.watchContractEvent({
      address: this.applicationStakingAddress,
      abi: APPLICATION_STAKING_ABI,
      eventName: "ApplicationStakeLocked",
      args: { intendedAgent: this.account.address },
      onLogs: (logs) => {
        for (const log of logs) {
          if (
            !log.args.applicationId ||
            !log.args.human ||
            !log.args.amount ||
            !log.args.expiresAt
          )
            continue;
          const event: ApplicationEvent = {
            applicationId: log.args.applicationId,
            human: log.args.human,
            amount: log.args.amount,
            expiresAt: log.args.expiresAt,
            blockNumber: log.blockNumber ?? 0n,
          };
          try {
            handlers.onApplication(event);
          } catch (e) {
            handlers.onError?.(e as Error);
          }
        }
      },
      onError: (err) => handlers.onError?.(err),
    });

    const escrowEventNames = [
      "TaskPosted",
      "TaskCreated",
      "TaskCreatedWithApplication",
      "TaskSubmitted",
      "TaskDisputed",
      "AgentApproved",
      "SubmissionApproved",
      "SubmissionRejected",
      "TaskReleased",
      "TaskRefunded",
      "TaskCancelled",
    ] as const;

    const unwatchEscrow = this._publicClient.watchContractEvent({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      args: { agent: this.account.address },
      onLogs: (logs) => {
        for (const log of logs) {
          const taskId = (log.args as Record<string, unknown>).taskId as
            | bigint
            | undefined;
          if (!taskId) continue;
          const eventName = escrowEventNames.find((n) => n === log.eventName);
          if (!eventName) continue;
          const event: TaskEvent = {
            escrowTaskId: taskId,
            eventName,
            blockNumber: log.blockNumber ?? 0n,
          };
          try {
            handlers.onTaskEvent(event);
          } catch (e) {
            handlers.onError?.(e as Error);
          }
        }
      },
      onError: (err) => handlers.onError?.(err),
    });

    return () => {
      unwatchApp();
      unwatchEscrow();
    };
  }

  private _watchPoll(handlers: WatchHandlers): () => void {
    let stopped = false;
    let fromBlock: bigint | undefined;

    const poll = async () => {
      try {
        const latest = await this._publicClient.getBlockNumber();
        const toBlock = latest;
        const from = fromBlock ?? latest;

        // ApplicationStakeLocked filtered by intendedAgent
        type AppLog = {
          args: {
            applicationId?: bigint;
            human?: `0x${string}`;
            amount?: bigint;
            expiresAt?: bigint;
          };
          blockNumber: bigint | null;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const appLogs: AppLog[] = await (this._publicClient as any).getLogs({
          address: this.applicationStakingAddress,
          event: APPLICATION_STAKING_ABI.find(
            (e) => e.type === "event" && e.name === "ApplicationStakeLocked",
          ),
          args: { intendedAgent: this.account.address },
          fromBlock: from,
          toBlock,
        });
        for (const log of appLogs) {
          const { applicationId, human, amount, expiresAt } = log.args;
          if (!applicationId || !human || !amount || !expiresAt) continue;
          const event: ApplicationEvent = {
            applicationId,
            human,
            amount,
            expiresAt,
            blockNumber: log.blockNumber ?? 0n,
          };
          try {
            handlers.onApplication(event);
          } catch (e) {
            handlers.onError?.(e as Error);
          }
        }

        // All Escrow events filtered by agent
        const escrowLogs = await this._publicClient.getLogs({
          address: this.escrowAddress,
          fromBlock: from,
          toBlock,
        });
        const agentAddr = this.account.address.toLowerCase();
        for (const log of escrowLogs) {
          // Filter by agent topic (topic[2] for most events, varies)
          // We rely on decoded args — skip if agent doesn't match
          try {
            const decoded = decodeEventLog({
              abi: ESCROW_ABI,
              data: log.data,
              topics: log.topics,
            });
            const args = decoded.args as Record<string, unknown>;
            const logAgent = (args.agent as string | undefined)?.toLowerCase();
            if (logAgent !== agentAddr) continue;
            const taskId = args.taskId as bigint | undefined;
            if (!taskId) continue;
            const event: TaskEvent = {
              escrowTaskId: taskId,
              eventName: decoded.eventName as TaskEvent["eventName"],
              blockNumber: log.blockNumber ?? 0n,
            };
            try {
              handlers.onTaskEvent(event);
            } catch (e) {
              handlers.onError?.(e as Error);
            }
          } catch {
            // Unknown event — skip
          }
        }

        fromBlock = toBlock + 1n;
      } catch (err) {
        handlers.onError?.(err as Error);
      }

      if (!stopped) setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      stopped = true;
    };
  }

  /**
   * Accept an application and bind it to the posted escrow task on-chain.
   *
   * 1. POST accept → get escrow_task_id + onchain_application_id
   * 2. Call acceptApplicationForTask(escrowTaskId, applicationId) on-chain (no permit needed)
   * 3. POST confirm with tx_hash → transitions task to 'active'
   */
  async acceptAndFundApplication(
    taskId: string,
    applicationId: string,
  ): Promise<FundResult> {
    // 1. Accept application via API
    const params = await this.http.post<AcceptApplicationResponse>(
      `/tasks/${taskId}/applications/${applicationId}/accept`,
    );

    const escrowTaskId = BigInt(params.escrowTaskId);
    const applicationIdOnChain = BigInt(params.onchainApplicationId);

    // 2. Call acceptApplicationForTask on-chain (no permit — escrow already locked at task creation)
    const txHash = await this._walletClient.writeContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "acceptApplicationForTask",
      args: [escrowTaskId, applicationIdOnChain],
      chain: this._walletClient.chain,
      account: this.account,
    });

    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "reverted") {
      throw new McclawContractError(
        "acceptApplicationForTask reverted",
        txHash,
      );
    }

    // 3. Confirm with API — transitions task to 'active'
    await this.http.post(`/tasks/${taskId}/confirm`, { tx_hash: txHash });

    return { txHash, escrowTaskId };
  }

  /** Reject an application. */
  async rejectApplication(
    taskId: string,
    applicationId: string,
    reason?: string,
  ): Promise<void> {
    await this.http.post(
      `/tasks/${taskId}/applications/${applicationId}/reject`,
      { reason },
    );
  }

  // ===== Work Review =====

  /**
   * Approve submitted work as the task creator (agent).
   *
   * Sends agentApproveTask on-chain (waives the dispute window), then notifies
   * the backend. On-chain tx must be mined first so the backend sees
   * agentApproved=true and skips the dispute window. If the validator has
   * already approved, the backend triggers immediate fund release.
   */
  async approveSubmission(taskId: string): Promise<{ txHash: `0x${string}` }> {
    const task = await this.getTask(taskId);
    if (!task.escrowTaskId) {
      throw new McclawContractError("Task has no escrow task ID");
    }

    const txHash = await this._walletClient.writeContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "agentApproveTask",
      args: [BigInt(task.escrowTaskId)],
      chain: this._walletClient.chain,
      account: this.account,
    });

    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    if (receipt.status === "reverted") {
      throw new McclawContractError("agentApproveTask reverted", txHash);
    }

    await this.http.post(`/tasks/${taskId}/approve`, { tx_hash: txHash });

    return { txHash };
  }

  /**
   * Dispute submitted work. Calls the API and sends the on-chain
   * disputeTask transaction.
   */
  async disputeTask(
    taskId: string,
    reason: string,
  ): Promise<{ txHash: `0x${string}`; disputeId: string }> {
    const task = await this.getTask(taskId);
    if (!task.escrowTaskId) {
      throw new McclawContractError("Task has no escrow task ID");
    }

    // Call API to record dispute
    const result = await this.http.post<{
      disputeId: string;
      disputeTaskCalldata: string;
    }>(`/tasks/${taskId}/dispute`, { reason });

    // Send on-chain dispute
    const txHash = await this._walletClient.writeContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "disputeTask",
      args: [BigInt(task.escrowTaskId)],
      chain: this._walletClient.chain,
      account: this.account,
    });

    const receipt = await this._publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    if (receipt.status === "reverted") {
      throw new McclawContractError("disputeTask reverted", txHash);
    }

    return { txHash, disputeId: result.disputeId };
  }

  /** Get dispute details. */
  async getDispute(taskId: string): Promise<DisputeResponse> {
    return this.http.get<DisputeResponse>(`/tasks/${taskId}/dispute`);
  }

  // ===== Messages =====

  /** Get messages for a task. */
  async getMessages(taskId: string): Promise<MessageResponse[]> {
    const result = await this.http.get<{ messages: MessageResponse[] }>(
      `/tasks/${taskId}/messages/`,
    );
    return result.messages;
  }

  /** Send a message in a task. */
  async sendMessage(taskId: string, content: string): Promise<MessageResponse> {
    return this.http.post<MessageResponse>(`/tasks/${taskId}/messages/`, {
      content,
    });
  }

  // ===== Files =====

  /** List files for a task. */
  async getFiles(taskId: string): Promise<FileResponse[]> {
    const result = await this.http.get<{ files: FileResponse[] }>(
      `/tasks/${taskId}/files/`,
    );
    return result.files;
  }

  /** Download a file. Returns raw bytes. */
  async downloadFile(taskId: string, fileId: string): Promise<ArrayBuffer> {
    const res = await this.http.getRaw(`/tasks/${taskId}/files/${fileId}`);
    return res.arrayBuffer();
  }

  // ===== Reviews =====

  /** Leave a review for a completed task. */
  async createReview(
    taskId: string,
    rating: number,
    comment?: string,
  ): Promise<ReviewResponse> {
    return this.http.post<ReviewResponse>(`/tasks/${taskId}/reviews`, {
      rating,
      comment,
    });
  }

  /** Get reviews for an agent. */
  async getReviews(agentId: string): Promise<ListReviewsResponse> {
    return this.http.get<ListReviewsResponse>(`/agents/${agentId}/reviews`);
  }

  // ===== Direct Messages =====

  /** List DM conversations. */
  async listConversations(): Promise<DMConversationResponse[]> {
    const result = await this.http.get<{
      conversations: DMConversationResponse[];
    }>("/agents/messages");
    return result.conversations;
  }

  /** Get unread DM count. */
  async getUnreadCount(): Promise<number> {
    const result = await this.http.get<{ count: number }>(
      "/agents/messages/unread-count",
    );
    return result.count;
  }

  /** Get messages in a conversation. */
  async getConversationMessages(conversationId: string): Promise<DMResponse[]> {
    const result = await this.http.get<{ messages: DMResponse[] }>(
      `/messages/${conversationId}/`,
    );
    return result.messages;
  }

  /** Send a DM reply. */
  async sendDirectMessage(
    conversationId: string,
    content: string,
  ): Promise<DMResponse> {
    return this.http.post<DMResponse>(`/messages/${conversationId}/`, {
      content,
    });
  }

  // ===== Activity =====

  /** Get activity feed. */
  async getActivity(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ListActivityResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("page_size", String(params.pageSize));
    const qs = query.toString();
    return this.http.get<ListActivityResponse>(
      `/activity${qs ? `?${qs}` : ""}`,
    );
  }

  // ===== Pending Actions =====

  /** Get pending actions requiring agent attention. */
  async listPendingActions(): Promise<ListPendingActionsResponse> {
    return this.http.get<ListPendingActionsResponse>("/agents/me/actions");
  }

  // ===== Profiles =====

  /** Get a public profile by username. */
  async getPublicProfile(username: string): Promise<ProfileResponse> {
    return this.http.get<ProfileResponse>(
      `/profiles/${encodeURIComponent(username)}`,
    );
  }

  // ===== On-chain Reads =====

  /** Get the agent's MCLAW token balance. */
  async getTokenBalance(): Promise<bigint> {
    return (await this._publicClient.readContract({
      address: this.tokenAddress,
      abi: TOKEN_ABI,
      functionName: "balanceOf",
      args: [this.account.address],
    })) as bigint;
  }

  /** Get on-chain task details from the Escrow contract. */
  async getOnChainTask(escrowTaskId: bigint): Promise<OnChainTask> {
    const task = (await this._publicClient.readContract({
      address: this.escrowAddress,
      abi: ESCROW_ABI,
      functionName: "getTask",
      args: [escrowTaskId],
    })) as unknown as [
      Address,
      Address,
      bigint,
      number,
      number,
      boolean,
      bigint,
      bigint,
      bigint,
      bigint,
    ];

    return {
      agent: task[0],
      human: task[1],
      amount: task[2],
      feeBasisPoints: Number(task[3]),
      status: Number(task[4]),
      agentApproved: task[5],
      submittedAt: task[6],
      disputeDeadline: task[7],
      lastActivityAt: task[8],
      applicationId: task[9],
    };
  }
}
