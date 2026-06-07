import {
  generatePrivateKey,
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";
import { parseUnits, formatUnits } from "viem";

export interface WalletInfo {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

/**
 * Generate a new random wallet (private key + address).
 */
export function createWallet(): WalletInfo {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

const MCLAW_DECIMALS = 18;

/**
 * Convert a human-readable MCLAW amount to wei string.
 * @example parseMclaw("10") // "10000000000000000000"
 */
export function parseMclaw(amount: string): string {
  return parseUnits(amount, MCLAW_DECIMALS).toString();
}

/**
 * Format a wei string as a human-readable MCLAW amount.
 * @example formatMclaw("10000000000000000000") // "10"
 */
export function formatMclaw(wei: string): string {
  return formatUnits(BigInt(wei), MCLAW_DECIMALS);
}

/**
 * Sign an EIP-191 challenge message with a private key account.
 */
export async function signChallenge(
  account: PrivateKeyAccount,
  challenge: string,
): Promise<`0x${string}`> {
  return account.signMessage({ message: challenge });
}
