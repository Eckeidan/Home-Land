import { describe, expect, it } from "vitest";
import { assertLedgerBalanced, isLedgerBalanced, ledgerBalance } from "./ledger-policy.js";

describe("ledger policy", () => {
  it("accepts balanced ledger entries", () => {
    const entries = [
      { accountCode: "CASH", direction: "DEBIT" as const, amountMinor: 100_00 },
      { accountCode: "RENT_REVENUE", direction: "CREDIT" as const, amountMinor: 100_00 },
    ];

    expect(ledgerBalance(entries)).toBe(0);
    expect(isLedgerBalanced(entries)).toBe(true);
    expect(() => assertLedgerBalanced(entries)).not.toThrow();
  });

  it("rejects unbalanced ledger entries", () => {
    const entries = [
      { accountCode: "CASH", direction: "DEBIT" as const, amountMinor: 100_00 },
      { accountCode: "RENT_REVENUE", direction: "CREDIT" as const, amountMinor: 90_00 },
    ];

    expect(ledgerBalance(entries)).toBe(10_00);
    expect(isLedgerBalanced(entries)).toBe(false);
    expect(() => assertLedgerBalanced(entries)).toThrow("Ledger entries must balance");
  });

  it("rejects single-sided ledger entries", () => {
    const entries = [{ accountCode: "CASH", direction: "DEBIT" as const, amountMinor: 100_00 }];

    expect(isLedgerBalanced(entries)).toBe(false);
    expect(() => assertLedgerBalanced(entries)).toThrow("Ledger entries must balance");
  });

  it("rejects unsupported account codes", () => {
    const entries = [
      { accountCode: "RANDOM_ACCOUNT", direction: "DEBIT" as const, amountMinor: 100_00 },
      { accountCode: "RENT_REVENUE", direction: "CREDIT" as const, amountMinor: 100_00 },
    ];

    expect(() => assertLedgerBalanced(entries)).toThrow("Unsupported ledger account code");
  });

  it.each([0, -1, 1.5])("rejects invalid amount %s", (amountMinor) => {
    const entries = [
      { accountCode: "CASH", direction: "DEBIT" as const, amountMinor },
      { accountCode: "RENT_REVENUE", direction: "CREDIT" as const, amountMinor },
    ];

    expect(() => assertLedgerBalanced(entries)).toThrow(
      "Ledger entry amount must be positive integer",
    );
  });
});
