export class McclawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McclawError";
  }
}

export class McclawApiError extends McclawError {
  readonly status: number;
  readonly body: { error: string };
  readonly retryAfter?: number;

  constructor(status: number, body: { error: string }, retryAfter?: number) {
    super(`API error ${status}: ${body.error}`);
    this.name = "McclawApiError";
    this.status = status;
    this.body = body;
    this.retryAfter = retryAfter;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isSuspended(): boolean {
    return this.status === 403;
  }
}

export class McclawContractError extends McclawError {
  readonly txHash?: `0x${string}`;

  constructor(message: string, txHash?: `0x${string}`) {
    super(message);
    this.name = "McclawContractError";
    this.txHash = txHash;
  }
}
