export interface RentAmount {
  readonly amountMinor: number;
}

export function rentAmount(amountMinor: number): RentAmount {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("Rent amount must be integer");
  }

  if (amountMinor <= 0) {
    throw new Error("Rent amount must be positive");
  }

  return {
    amountMinor,
  };
}
