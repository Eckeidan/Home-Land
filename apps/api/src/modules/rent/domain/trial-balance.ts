import type { LedgerDirection } from "./ledger-policy.js";

export interface TrialBalanceEntry {
  accountCode: string;
  direction: LedgerDirection;
  amountMinor: number;
}

export interface TrialBalanceLine {
  accountCode: string;
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
}

export interface TrialBalance {
  lines: TrialBalanceLine[];
  debitTotalMinor: number;
  creditTotalMinor: number;
  balanced: boolean;
}

export function trialBalance(entries: TrialBalanceEntry[]): TrialBalance {
  const byAccount = new Map<string, TrialBalanceLine>();

  for (const entry of entries) {
    const current = byAccount.get(entry.accountCode) ?? {
      accountCode: entry.accountCode,
      debitMinor: 0,
      creditMinor: 0,
      balanceMinor: 0,
    };

    if (entry.direction === "DEBIT") current.debitMinor += entry.amountMinor;
    else current.creditMinor += entry.amountMinor;

    current.balanceMinor = current.debitMinor - current.creditMinor;
    byAccount.set(entry.accountCode, current);
  }

  const lines = [...byAccount.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  const debitTotalMinor = lines.reduce((sum, line) => sum + line.debitMinor, 0);
  const creditTotalMinor = lines.reduce((sum, line) => sum + line.creditMinor, 0);

  return {
    lines,
    debitTotalMinor,
    creditTotalMinor,
    balanced: debitTotalMinor === creditTotalMinor,
  };
}
