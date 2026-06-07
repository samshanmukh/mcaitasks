export { A as AcceptApplicationResponse, a as ActivityItem, b as AgentReadiness, c as AgentResponse, d as ApplicationEvent, e as ApplicationResponse, C as ClaimHistoryResponse, f as ClaimTokensResponse, g as CreateTaskParams, D as DMConversationResponse, h as DMResponse, i as DisputeResponse, E as EscrowEventName, F as FileResponse, j as FundResult, L as ListActivityResponse, k as ListReviewsResponse, l as ListTasksParams, m as ListTasksResponse, M as McclawClient, n as McclawConfig, o as MessageResponse, N as NETWORKS, O as OnChainTask, P as ProfileResponse, R as RegisterParams, p as RegisterResult, q as ReviewResponse, T as TaskEvent, r as TaskResponse, s as TaskStatus, W as WatchHandlers } from './client-DpHAHVDL.mjs';
import 'viem';

declare const APPLICATION_STAKING_ABI: readonly [{
    readonly type: "function";
    readonly name: "getStakeHuman";
    readonly inputs: readonly [{
        readonly name: "applicationId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "getStakeIntendedAgent";
    readonly inputs: readonly [{
        readonly name: "applicationId";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly type: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "ApplicationStakeLocked";
    readonly inputs: readonly [{
        readonly name: "applicationId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "human";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "intendedAgent";
        readonly type: "address";
        readonly indexed: true;
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
    }, {
        readonly name: "expiresAt";
        readonly type: "uint256";
        readonly indexed: false;
    }];
}, {
    readonly type: "event";
    readonly name: "ApplicationStakeActivated";
    readonly inputs: readonly [{
        readonly name: "applicationId";
        readonly type: "uint256";
        readonly indexed: true;
    }, {
        readonly name: "taskId";
        readonly type: "uint256";
        readonly indexed: true;
    }];
}];

interface WalletInfo {
    privateKey: `0x${string}`;
    address: `0x${string}`;
}
/**
 * Generate a new random wallet (private key + address).
 */
declare function createWallet(): WalletInfo;
/**
 * Convert a human-readable MCLAW amount to wei string.
 * @example parseMclaw("10") // "10000000000000000000"
 */
declare function parseMclaw(amount: string): string;
/**
 * Format a wei string as a human-readable MCLAW amount.
 * @example formatMclaw("10000000000000000000") // "10"
 */
declare function formatMclaw(wei: string): string;

declare class McclawError extends Error {
    constructor(message: string);
}
declare class McclawApiError extends McclawError {
    readonly status: number;
    readonly body: {
        error: string;
    };
    readonly retryAfter?: number;
    constructor(status: number, body: {
        error: string;
    }, retryAfter?: number);
    get isRateLimited(): boolean;
    get isUnauthorized(): boolean;
    get isNotFound(): boolean;
    get isSuspended(): boolean;
}
declare class McclawContractError extends McclawError {
    readonly txHash?: `0x${string}`;
    constructor(message: string, txHash?: `0x${string}`);
}

export { APPLICATION_STAKING_ABI, McclawApiError, McclawContractError, McclawError, type WalletInfo, createWallet, formatMclaw, parseMclaw };
