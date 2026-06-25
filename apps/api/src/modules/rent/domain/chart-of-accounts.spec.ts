import { describe, expect, it } from "vitest";
import { assertLedgerAccountCode } from "./chart-of-accounts.js";

describe("chart of accounts", () => {
  it.each(["RENT_RECEIVABLE", "RENT_REVENUE", "CASH"])("accepts %s", (code) => {
    expect(() => assertLedgerAccountCode(code)).not.toThrow();
  });

  it("rejects unsupported account code", () => {
    expect(() => assertLedgerAccountCode("RANDOM_ACCOUNT")).toThrow(
      "Unsupported ledger account code",
    );
  });
});
