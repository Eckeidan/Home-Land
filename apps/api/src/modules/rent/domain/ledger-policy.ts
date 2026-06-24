export type LedgerDirection = "DEBIT" | "CREDIT";

export interface LedgerEntryDraft {
  direction: LedgerDirection;
  amountMinor: number;
}

export function ledgerBalance(entries: LedgerEntryDraft[]): number {
  return entries.reduce(
    (sum, entry) => sum + (entry.direction === "DEBIT" ? entry.amountMinor : -entry.amountMinor),
    0,
  );
}

export function isLedgerBalanced(entries: LedgerEntryDraft[]): boolean {
  return entries.length >= 2 && ledgerBalance(entries) === 0;
}

export function assertLedgerBalanced(entries: LedgerEntryDraft[]): void {
  if (!isLedgerBalanced(entries)) {
    throw new Error("Ledger entries must balance");
  }
}
