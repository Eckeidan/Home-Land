import { describe, expect, it } from "vitest";
import { trialBalance } from "./trial-balance.js";

describe("trial balance", () => {
  it("summarizes ledger entries by account", () => {
    const result = trialBalance([
      { accountCode: "CASH", direction: "DEBIT", amountMinor: 100_00 },
      { accountCode: "RENT_REVENUE", direction: "CREDIT", amountMinor: 100_00 },
      { accountCode: "CASH", direction: "DEBIT", amountMinor: 50_00 },
      { accountCode: "RENT_RECEIVABLE", direction: "CREDIT", amountMinor: 50_00 },
    ]);

    expect(result.debitTotalMinor).toBe(150_00);
    expect(result.creditTotalMinor).toBe(150_00);
    expect(result.balanced).toBe(true);
    expect(result.lines).toEqual([
      { accountCode: "CASH", debitMinor: 150_00, creditMinor: 0, balanceMinor: 150_00 },
      {
        accountCode: "RENT_RECEIVABLE",
        debitMinor: 0,
        creditMinor: 50_00,
        balanceMinor: -50_00,
      },
      { accountCode: "RENT_REVENUE", debitMinor: 0, creditMinor: 100_00, balanceMinor: -100_00 },
    ]);
  });
});
