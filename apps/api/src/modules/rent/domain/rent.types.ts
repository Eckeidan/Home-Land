export interface CreateRentObligationCommand {
  organizationId: string;
  actorUserId: string;
  leaseId: string;
  period: string;
  idempotencyKey: string;
  correlationId: string;
}
export interface RentObligationCreated {
  id: string;
  leaseId: string;
  tenantName: string;
  unitCode: string;
  period: string;
  dueDate: string;
  amountMinor: number;
  currencyCode: "USD";
  status: "OPEN";
  ledgerTransactionId: string;
  ledgerBalanced: true;
  version: number;
}
export interface RecordPaymentCommand {
  organizationId: string;
  actorUserId: string;
  method: "ACH" | "CHECK" | "CASH" | "OTHER";
  receivedAt: string;
  externalReference?: string;
  allocations: Array<{ rentObligationId: string; amountMinor: number }>;
  idempotencyKey: string;
  correlationId: string;
}
export interface PaymentRecorded {
  id: string;
  tenantProfileId: string;
  amountMinor: number;
  currencyCode: "USD";
  method: "ACH" | "CHECK" | "CASH" | "OTHER";
  status: "POSTED";
  receivedAt: string;
  allocations: Array<{ rentObligationId: string; amountMinor: number }>;
  ledgerTransactionId: string;
  ledgerBalanced: true;
  receipt: { id: string; receiptNumber: string; issuedAt: string };
}
export interface RecordRefundCommand {
  organizationId: string;
  actorUserId: string;
  paymentId: string;
  reason: string;
  refundedAt: string;
  allocations: Array<{ paymentAllocationId: string; amountMinor: number }>;
  idempotencyKey: string;
  correlationId: string;
}
export interface RefundRecorded {
  id: string;
  paymentId: string;
  amountMinor: number;
  currencyCode: "USD";
  reason: string;
  status: "POSTED";
  refundedAt: string;
  allocations: Array<{ paymentAllocationId: string; amountMinor: number }>;
  ledgerTransactionId: string;
  ledgerBalanced: true;
  reconciliationItemId: string;
}
export interface ResolveReconciliationCommand {
  organizationId: string;
  actorUserId: string;
  itemId: string;
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
}
