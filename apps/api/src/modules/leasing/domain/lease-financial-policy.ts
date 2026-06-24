import type { LeaseTerm } from "./lease-term.js";
import type { RentAmount } from "./rent-amount.js";
import type { SecurityDeposit } from "./security-deposit.js";

export interface LeaseFinancialPolicyInput {
  rent: RentAmount;
  deposit: SecurityDeposit;
  rentDueDay: number;
  term: LeaseTerm;
}

export function assertLeaseFinancialPolicy(input: LeaseFinancialPolicyInput): void {
  if (!Number.isInteger(input.rentDueDay) || input.rentDueDay < 1 || input.rentDueDay > 28) {
    throw new Error("Rent due day must be between 1 and 28");
  }

  if (input.deposit.amountMinor > input.rent.amountMinor * 3) {
    throw new Error("Security deposit cannot exceed three months rent");
  }

  const durationDays =
    (input.term.endDate.getTime() - input.term.startDate.getTime()) / (24 * 60 * 60 * 1000);

  if (durationDays < 30) throw new Error("Lease duration must be at least 30 days");
  if (durationDays > 3650) throw new Error("Lease duration cannot exceed 10 years");
}
