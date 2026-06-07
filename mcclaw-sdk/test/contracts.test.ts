import { describe, it, expect } from "vitest";
import {
  ESCROW_ABI,
  TOKEN_ABI,
  APPLICATION_STAKING_ABI,
  PERMIT_TYPES,
  buildPermitDomain,
} from "../src/contracts.js";

describe("ESCROW_ABI", () => {
  it("contains createTaskFromApplicationWithPermit", () => {
    const fn = ESCROW_ABI.find(
      (e) =>
        e.type === "function" &&
        e.name === "createTaskFromApplicationWithPermit",
    );
    expect(fn).toBeDefined();
    expect(fn!.type).toBe("function");
  });

  it("contains approveSubmission, disputeTask, cancelTask", () => {
    for (const name of ["approveSubmission", "disputeTask", "cancelTask"]) {
      const fn = ESCROW_ABI.find(
        (e) => e.type === "function" && e.name === name,
      );
      expect(fn).toBeDefined();
    }
  });

  it("contains TaskCreatedWithApplication event", () => {
    const ev = ESCROW_ABI.find(
      (e) => e.type === "event" && e.name === "TaskCreatedWithApplication",
    );
    expect(ev).toBeDefined();
  });
});

describe("APPLICATION_STAKING_ABI", () => {
  it("contains getStakeHuman and getStakeIntendedAgent view functions", () => {
    for (const name of ["getStakeHuman", "getStakeIntendedAgent"]) {
      const fn = APPLICATION_STAKING_ABI.find(
        (e) => e.type === "function" && e.name === name,
      );
      expect(fn).toBeDefined();
      expect(fn!.stateMutability).toBe("view");
    }
  });

  it("contains ApplicationStakeLocked event with intendedAgent", () => {
    const ev = APPLICATION_STAKING_ABI.find(
      (e) => e.type === "event" && e.name === "ApplicationStakeLocked",
    );
    expect(ev).toBeDefined();
    const inputs = (ev as { inputs: { name: string; indexed: boolean }[] })
      .inputs;
    const agentInput = inputs.find((i) => i.name === "intendedAgent");
    expect(agentInput).toBeDefined();
    expect(agentInput!.indexed).toBe(true);
  });

  it("contains ApplicationStakeActivated event", () => {
    const ev = APPLICATION_STAKING_ABI.find(
      (e) => e.type === "event" && e.name === "ApplicationStakeActivated",
    );
    expect(ev).toBeDefined();
  });
});

describe("TOKEN_ABI", () => {
  it("contains balanceOf and nonces", () => {
    for (const name of ["balanceOf", "nonces"]) {
      const fn = TOKEN_ABI.find(
        (e) => e.type === "function" && e.name === name,
      );
      expect(fn).toBeDefined();
    }
  });
});

describe("PERMIT_TYPES", () => {
  it("has the correct EIP-2612 fields", () => {
    const fields = PERMIT_TYPES.Permit.map((f) => f.name);
    expect(fields).toEqual(["owner", "spender", "value", "nonce", "deadline"]);
  });
});

describe("buildPermitDomain", () => {
  it("returns correct domain for McClaw Token", () => {
    const domain = buildPermitDomain(
      "0x1234567890abcdef1234567890abcdef12345678",
      84532,
    );

    expect(domain.name).toBe("McClaw Token");
    expect(domain.version).toBe("1");
    expect(domain.chainId).toBe(84532);
    expect(domain.verifyingContract).toBe(
      "0x1234567890abcdef1234567890abcdef12345678",
    );
  });
});
