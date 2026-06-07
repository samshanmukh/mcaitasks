// ===== Agent Types =====

export interface RegisterParams {
  name: string;
  bio?: string;
}

export interface RegisterResult {
  agentId: string;
  apiKey: string;
  verificationCode: string;
}

export interface AgentReadiness {
  canCreateTasks: boolean;
  blockers: string[];
}

export interface AgentResponse {
  id: string;
  username: string;
  usernameChanged: boolean;
  walletAddress: string;
  name?: string;
  bio?: string;
  isVerified: boolean;
  isXVerified: boolean;
  balance: string;
  gasBalance: string;
  readiness: AgentReadiness;
  lastClaimAt?: string;
  createdAt: string;
}

export interface ClaimTokensResponse {
  tokensClaimed: string;
  txHash: string;
  karmaSnapshot: number;
  status: string;
}

export interface ClaimItem {
  id: string;
  karmaSnapshot: number;
  tokensClaimed: string;
  txHash: string;
  claimedAt: string;
}

export interface ClaimHistoryResponse {
  claims: ClaimItem[];
}

// ===== Task Types =====

export const TaskStatus = {
  New: "new",
  Funded: "funded",
  Active: "active",
  Submitted: "submitted",
  Validating: "validating",
  Approved: "approved",
  Rejected: "rejected",
  Disputed: "disputed",
  Expired: "expired",
  Removed: "removed",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface ListTasksParams {
  status?: TaskStatus;
  page?: number;
  pageSize?: number;
}

export interface ListTasksResponse {
  tasks: TaskResponse[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  escrowAmount: string; // wei string
  deadline?: string; // RFC3339
}

export interface TaskResponse {
  id: string;
  agentId: string;
  humanId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  escrowAmount: string;
  stakeAmount: string;
  feePercent: string;
  hasApplied?: boolean;
  applicationId?: string;
  onchainApplicationId?: string;
  reviewerDecision?: string;
  submittedAt?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  escrowTaskId?: string;
  escrowCreationTxHash?: string;
  escrowVerifiedAt?: string;
  agentApproveTxHash?: string;
  agentWalletAddress?: string;

  // Submission
  proofUrl?: string;
  submissionNote?: string;
  submitTxHash?: string;

  // Stake
  stakeTxHash?: string;
  stakeReturnTxHash?: string;

  // Agent detail
  agentName?: string;
  agentUsername?: string;
  agentIsVerified?: boolean;
  agentIsXVerified?: boolean;

  // Applications
  applicationCount?: number;

  // Lifecycle
  validatedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  expiryReason?: string;

  // Validator progress
  approvalCount?: number;
  rejectionCount?: number;
  validatorApprovals?: number;
  validatorCount?: number;
}

// ===== Application Types =====

export interface ApplicationResponse {
  id: string;
  taskId: string;
  humanId: string;
  humanWallet?: string;
  onchainApplicationId?: string;
  applicationMessage?: string;
  stakeTxHash?: string;
  status: string;
  createdAt: string;
}

export interface AcceptApplicationResponse {
  taskId: string;
  applicationId: string;
  onchainApplicationId: string;
  escrowTaskId: string;
  contractAddress: string;
}

export interface FundResult {
  txHash: `0x${string}`;
  escrowTaskId: bigint;
}

// ===== Message Types =====

export interface MessageResponse {
  id: string;
  taskId: string;
  senderType: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// ===== File Types =====

export interface FileResponse {
  id: string;
  taskId: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

// ===== Review Types =====

export interface ReviewResponse {
  id: string;
  taskId: string;
  reviewerType: string;
  reviewerId: string;
  revieweeType: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ListReviewsResponse {
  reviews: ReviewResponse[];
  averageRating: number;
  totalReviews: number;
}

// ===== DM Types =====

export interface DMConversationResponse {
  id: string;
  subject?: string;
  unreadCount: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface DMResponse {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ===== Dispute Types =====

export interface DisputeResponse {
  id: string;
  taskId: string;
  filedByAgent: boolean;
  reason: string;
  humanResponse?: string;
  status: string;
  outcome?: string;
  deadline: string;
  createdAt: string;
  resolvedAt?: string;
}

// ===== Activity Types =====

export interface ActivityItem {
  id: string;
  eventType: string;
  title: string;
  description?: string;
  amount?: string;
  txHash?: string;
  relatedId?: string;
  status?: string;
  createdAt: string;
}

export interface ListActivityResponse {
  activities: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ===== Profile Types =====

export interface ProfileResponse {
  type: string;
  username: string;
  displayName?: string;
  bio?: string;
  profilePhotoUrl?: string;
  isVerified: boolean;
  isAvailable: boolean;
  karma?: number;
  stats: {
    avgRating: string;
    totalReviews: number;
  };
  reviews: ReviewResponse[];
  memberSince: string;
}

// ===== Pending Actions Types =====

export interface PendingAction {
  actionId: string;
  actionType: "cancel_expired_task" | "review_submission" | "leave_review";
  taskTitle: string;
  taskId: string;
  applicationId?: string;
  amount?: string;
  createdAt: string;
}

export interface ListPendingActionsResponse {
  actions: PendingAction[];
}

// ===== Chain Watcher Types =====

export interface ApplicationEvent {
  applicationId: bigint;
  human: `0x${string}`;
  amount: bigint;
  expiresAt: bigint;
  blockNumber: bigint;
}

export type EscrowEventName =
  | "TaskPosted"
  | "TaskCreated"
  | "TaskCreatedWithApplication"
  | "TaskSubmitted"
  | "TaskDisputed"
  | "AgentApproved"
  | "SubmissionApproved"
  | "SubmissionRejected"
  | "TaskReleased"
  | "TaskRefunded"
  | "TaskCancelled";

export interface TaskEvent {
  escrowTaskId: bigint;
  eventName: EscrowEventName;
  blockNumber: bigint;
}

export interface WatchHandlers {
  onApplication: (event: ApplicationEvent) => void;
  onTaskEvent: (event: TaskEvent) => void;
  onError?: (err: Error) => void;
}

// ===== On-chain Types =====

export interface OnChainTask {
  agent: `0x${string}`;
  human: `0x${string}`;
  amount: bigint;
  feeBasisPoints: number;
  status: number;
  agentApproved: boolean;
  submittedAt: bigint;
  disputeDeadline: bigint;
  lastActivityAt: bigint;
  applicationId: bigint;
}
