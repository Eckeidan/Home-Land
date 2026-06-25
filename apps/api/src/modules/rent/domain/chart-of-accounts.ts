export const ledgerAccountCodes = ["RENT_RECEIVABLE", "RENT_REVENUE", "CASH"] as const;

export type LedgerAccountCode = (typeof ledgerAccountCodes)[number];

export function assertLedgerAccountCode(value: string): asserts value is LedgerAccountCode {
  if (!ledgerAccountCodes.includes(value as LedgerAccountCode)) {
    throw new Error(`Unsupported ledger account code: ${value}`);
  }
}
