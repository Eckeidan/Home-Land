export interface SecurityDeposit {
  readonly amountMinor: number;
}

export function securityDeposit(amountMinor: number): SecurityDeposit {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("Security deposit must be integer");
  }

  if (amountMinor < 0) {
    throw new Error("Security deposit cannot be negative");
  }

  return {
    amountMinor,
  };
}
