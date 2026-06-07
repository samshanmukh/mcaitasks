import type { Address } from "viem";

// Escrow contract ABI — agent-relevant functions and events only
export const ESCROW_ABI = [
  // ===== Functions =====
  {
    type: "function",
    name: "createTaskFromApplicationWithPermit",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "feeBasisPoints", type: "uint16" },
      { name: "applicationId", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "postTaskWithPermit",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "feeBasisPoints", type: "uint16" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "taskId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "acceptApplicationForTask",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "applicationId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "agent", type: "address" },
          { name: "human", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "feeBasisPoints", type: "uint16" },
          { name: "status", type: "uint8" },
          { name: "agentApproved", type: "bool" },
          { name: "submittedAt", type: "uint256" },
          { name: "disputeDeadline", type: "uint256" },
          { name: "lastActivityAt", type: "uint256" },
          { name: "applicationId", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "agentApproveTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approveSubmission",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "disputeTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelTask",
    inputs: [{ name: "taskId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // ===== Events =====
  {
    type: "event",
    name: "TaskPosted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "feeBasisPoints", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCreated",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "feeBasisPoints", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCreatedWithApplication",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "applicationId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TaskSubmitted",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "submittedAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskDisputed",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "caller", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "disputedAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AgentApproved",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "SubmissionApproved",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "SubmissionRejected",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TaskReleased",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "human", type: "address", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "humanAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskRefunded",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TaskCancelled",
    inputs: [
      { name: "taskId", type: "uint256", indexed: true },
      { name: "agent", type: "address", indexed: true },
      { name: "human", type: "address", indexed: true },
      { name: "refundAmount", type: "uint256", indexed: false },
      { name: "feeAmount", type: "uint256", indexed: false },
    ],
  },
] as const;

// Token contract ABI — permit nonce + balance only
export const TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "nonces",
    type: "function",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ApplicationStaking contract ABI — read functions and events for agents
export const APPLICATION_STAKING_ABI = [
  {
    type: "function",
    name: "getStakeHuman",
    inputs: [{ name: "applicationId", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getStakeIntendedAgent",
    inputs: [{ name: "applicationId", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ApplicationStakeLocked",
    inputs: [
      { name: "applicationId", type: "uint256", indexed: true },
      { name: "human", type: "address", indexed: true },
      { name: "intendedAgent", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "expiresAt", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ApplicationStakeActivated",
    inputs: [
      { name: "applicationId", type: "uint256", indexed: true },
      { name: "taskId", type: "uint256", indexed: true },
    ],
  },
] as const;

// EIP-2612 Permit typed data types
export const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

/**
 * Build the EIP-712 domain for the McClaw Token permit.
 */
export function buildPermitDomain(
  tokenAddress: Address,
  chainId: number,
): {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
} {
  return {
    name: "McClaw Token",
    version: "1",
    chainId,
    verifyingContract: tokenAddress,
  };
}
