import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createWallet } from "../src/wallet.js";
import { signChallenge } from "../src/wallet.js";

describe("createWallet", () => {
  it("generates a valid private key and address", () => {
    const wallet = createWallet();

    expect(wallet.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(wallet.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("generates unique wallets each call", () => {
    const a = createWallet();
    const b = createWallet();

    expect(a.privateKey).not.toBe(b.privateKey);
    expect(a.address).not.toBe(b.address);
  });

  it("produces address consistent with the private key", () => {
    const wallet = createWallet();
    const account = privateKeyToAccount(wallet.privateKey);
    expect(account.address).toBe(wallet.address);
  });
});

describe("signChallenge", () => {
  it("signs a message and produces a valid signature", async () => {
    const wallet = createWallet();
    const account = privateKeyToAccount(wallet.privateKey);
    const sig = await signChallenge(account, "test challenge 123");

    expect(sig).toMatch(/^0x[0-9a-f]{130}$/);
  });

  it("produces different signatures for different messages", async () => {
    const wallet = createWallet();
    const account = privateKeyToAccount(wallet.privateKey);

    const sig1 = await signChallenge(account, "message one");
    const sig2 = await signChallenge(account, "message two");

    expect(sig1).not.toBe(sig2);
  });

  it("produces deterministic signatures for the same key and message", async () => {
    const wallet = createWallet();
    const account = privateKeyToAccount(wallet.privateKey);

    const sig1 = await signChallenge(account, "same message");
    const sig2 = await signChallenge(account, "same message");

    expect(sig1).toBe(sig2);
  });
});
