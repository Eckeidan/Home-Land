import { describe, expect, it } from "vitest";
import { assertLedgerBalanced, isLedgerBalanced, ledgerBalance } from "./ledger-policy.js";

describe("ledger policy", () => {
  it("accepts balanced debit and credit entries", () => {
    const entries = [
      { direction: "DEBIT" as const, amountMinor: 100_00 },
      { direction: "CREDIT" as const, amountMinor: 100_00 },
    ];

    expect(ledgerBalance(entries)).toBe(0);
    expect(isLedgerBalanced(entries)).toBe(true);
    expect(() => assertLedgerBalanced(entries)).not.toThrow();
  });

  it("rejects unbalanced entries", () => {
    const entries = [
      { direction: "DEBIT" as const, amountMinor: 100_00 },
      { direction: "CREDIT" as const, amountMinor: 90_00 },
    ];

    expect(ledgerBalance(entries)).toBe(10_00);
    expect(isLedgerBalanced(entries)).toBe(false);
    expect(() => assertLedgerBalanced(entries)).toThrow("Ledger entries must balance");
  });

  it("rejects single-sided entries", () => {
    const entries = [{ direction: "DEBIT" as const, amountMinor: 100_00 }];

    expect(isLedgerBalanced(entries)).toBe(false);
    expect(() => assertLedgerBalanced(entries)).toThrow("Ledger entries must balance");
  });
});
