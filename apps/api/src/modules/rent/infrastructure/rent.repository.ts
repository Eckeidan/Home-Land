import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import { assertLedgerBalanced } from "../domain/ledger-policy.js";
import type {
  PaymentRecorded,
  RefundRecorded,
  RentObligationCreated,
} from "../domain/rent.types.js";

interface Input {
  organizationId: string;
  actorUserId: string;
  leaseId: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}
export type RentResult =
  | { kind: "created" | "replayed"; response: RentObligationCreated }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "lease_inactive"
        | "period_not_covered"
        | "duplicate"
        | "idempotency_conflict"
        | "concurrent";
    };
interface PaymentInput {
  organizationId: string;
  actorUserId: string;
  method: "ACH" | "CHECK" | "CASH" | "OTHER";
  receivedAt: Date;
  externalReference?: string;
  allocations: Array<{ rentObligationId: string; amountMinor: number }>;
  receiptNumber: string;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}
export type PaymentResult =
  | { kind: "created" | "replayed"; response: PaymentRecorded }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "allocation_invalid"
        | "tenant_mismatch"
        | "idempotency_conflict"
        | "concurrent";
    };
interface RefundInput {
  organizationId: string;
  actorUserId: string;
  paymentId: string;
  reason: string;
  refundedAt: Date;
  allocations: Array<{ paymentAllocationId: string; amountMinor: number }>;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}
export type RefundResult =
  | { kind: "created" | "replayed"; response: RefundRecorded }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "allocation_invalid"
        | "idempotency_conflict"
        | "concurrent";
    };
@Injectable()
export class RentRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}
  async snapshot(organizationId: string, actorUserId: string) {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: { role: true, organization: { select: { displayName: true, slug: true } } },
    });
    if (!membership) return { kind: "not_found" as const };
    if (!["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"].includes(membership.role))
      return { kind: "forbidden" as const };
    const [obligations, leases, payments, reconciliationItems] = await Promise.all([
      this.database.rentObligation.findMany({
        where: { organizationId },
        orderBy: { dueDate: "desc" },
        select: {
          id: true,
          leaseId: true,
          periodStart: true,
          dueDate: true,
          amountMinor: true,
          currencyCode: true,
          status: true,
          version: true,
          lease: {
            select: {
              tenantProfile: { select: { firstName: true, lastName: true } },
              unit: { select: { unitCode: true } },
            },
          },
          transaction: {
            select: { id: true, entries: { select: { direction: true, amountMinor: true } } },
          },
          allocations: { select: { amountMinor: true } },
        },
      }),
      this.database.lease.findMany({
        where: { organizationId, status: "ACTIVE" },
        orderBy: { startDate: "asc" },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          monthlyRentMinor: true,
          tenantProfile: { select: { firstName: true, lastName: true } },
          unit: { select: { unitCode: true } },
        },
      }),
      this.database.payment.findMany({
        where: { organizationId },
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          amountMinor: true,
          method: true,
          receivedAt: true,
          tenantProfile: { select: { firstName: true, lastName: true } },
          receipt: { select: { receiptNumber: true, issuedAt: true } },
          allocations: {
            select: {
              id: true,
              amountMinor: true,
              rentObligationId: true,
              refundAllocations: { select: { amountMinor: true } },
            },
          },
        },
      }),
      this.database.reconciliationItem.findMany({
        where: { organizationId, status: "OPEN" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          kind: true,
          paymentId: true,
          refundId: true,
          createdAt: true,
          version: true,
        },
      }),
    ]);
    return {
      kind: "found" as const,
      snapshot: {
        organization: membership.organization,
        activeLeases: leases.map((lease) => ({
          id: lease.id,
          label: `${lease.tenantProfile.firstName} ${lease.tenantProfile.lastName} · Unit ${lease.unit.unitCode}`,
          startDate: lease.startDate.toISOString().slice(0, 10),
          endDate: lease.endDate.toISOString().slice(0, 10),
          monthlyRentMinor: lease.monthlyRentMinor,
        })),
        payments: payments.map((payment) => ({
          id: payment.id,
          tenantName: `${payment.tenantProfile.firstName} ${payment.tenantProfile.lastName}`,
          amountMinor: payment.amountMinor,
          method: payment.method,
          receivedAt: payment.receivedAt.toISOString(),
          receiptNumber: payment.receipt?.receiptNumber ?? null,
          issuedAt: payment.receipt?.issuedAt.toISOString() ?? null,
          refundableAllocations: payment.allocations
            .map((allocation) => ({
              paymentAllocationId: allocation.id,
              rentObligationId: allocation.rentObligationId,
              refundableMinor:
                allocation.amountMinor -
                allocation.refundAllocations.reduce((sum, refund) => sum + refund.amountMinor, 0),
            }))
            .filter((allocation) => allocation.refundableMinor > 0),
        })),
        reconciliationItems: reconciliationItems.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          version: Number(item.version),
        })),
        obligations: obligations.map((item) => ({
          id: item.id,
          leaseId: item.leaseId,
          tenantName: `${item.lease.tenantProfile.firstName} ${item.lease.tenantProfile.lastName}`,
          unitCode: item.lease.unit.unitCode,
          period: item.periodStart.toISOString().slice(0, 7),
          dueDate: item.dueDate.toISOString().slice(0, 10),
          amountMinor: item.amountMinor,
          currencyCode: item.currencyCode,
          status: item.status,
          allocatedMinor: item.allocations.reduce(
            (sum, allocation) => sum + allocation.amountMinor,
            0,
          ),
          outstandingMinor:
            item.amountMinor -
            item.allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0),
          version: Number(item.version),
          ledgerTransactionId: item.transaction?.id ?? null,
          ledgerBalanced: item.transaction
            ? item.transaction.entries.reduce(
                (sum, entry) =>
                  sum + (entry.direction === "DEBIT" ? entry.amountMinor : -entry.amountMinor),
                0,
              ) === 0
            : false,
        })),
      },
    };
  }
  async create(input: Input): Promise<RentResult> {
    const scope = `rent.obligation.create.v1:${input.organizationId}:${input.leaseId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (!["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"].includes(membership.role))
          return { kind: "forbidden" };
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
            return { kind: "idempotency_conflict" };
          return {
            kind: "replayed",
            response: existing.response as unknown as RentObligationCreated,
          };
        }
        const lease = await tx.lease.findFirst({
          where: { id: input.leaseId, organizationId: input.organizationId },
          select: {
            status: true,
            startDate: true,
            endDate: true,
            monthlyRentMinor: true,
            rentDueDay: true,
            tenantProfile: { select: { firstName: true, lastName: true } },
            unit: { select: { unitCode: true } },
          },
        });
        if (!lease) return { kind: "not_found" };
        if (lease.status !== "ACTIVE") return { kind: "lease_inactive" };
        if (lease.startDate > input.periodStart || lease.endDate < input.periodEnd)
          return { kind: "period_not_covered" };
        const dueDate = new Date(
          Date.UTC(
            input.periodStart.getUTCFullYear(),
            input.periodStart.getUTCMonth(),
            lease.rentDueDay,
          ),
        );
        const obligation = await tx.rentObligation.create({
          data: {
            organizationId: input.organizationId,
            leaseId: input.leaseId,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            dueDate,
            amountMinor: lease.monthlyRentMinor,
          },
          select: { id: true, version: true },
        });
        const transaction = await tx.ledgerTransaction.create({
          data: {
            organizationId: input.organizationId,
            rentObligationId: obligation.id,
            description: `Rent obligation ${input.period}`,
            correlationId: input.correlationId,
          },
          select: { id: true },
        });
        const entries = [
          {
            organizationId: input.organizationId,
            transactionId: transaction.id,
            accountCode: "RENT_RECEIVABLE",
            direction: "DEBIT" as const,
            amountMinor: lease.monthlyRentMinor,
          },
          {
            organizationId: input.organizationId,
            transactionId: transaction.id,
            accountCode: "RENT_REVENUE",
            direction: "CREDIT" as const,
            amountMinor: lease.monthlyRentMinor,
          },
        ];

        assertLedgerBalanced(entries);

        await tx.ledgerEntry.createMany({ data: entries });
        const response: RentObligationCreated = {
          id: obligation.id,
          leaseId: input.leaseId,
          tenantName: `${lease.tenantProfile.firstName} ${lease.tenantProfile.lastName}`,
          unitCode: lease.unit.unitCode,
          period: input.period,
          dueDate: dueDate.toISOString().slice(0, 10),
          amountMinor: lease.monthlyRentMinor,
          currencyCode: "USD",
          status: "OPEN",
          ledgerTransactionId: transaction.id,
          ledgerBalanced: true,
          version: Number(obligation.version),
        };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "rent.obligation.created",
            targetType: "RentObligation",
            targetId: obligation.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { ledgerTransactionId: transaction.id, amountMinor: lease.monthlyRentMinor },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: "RentObligationCreated",
            aggregateType: "RentObligation",
            aggregateId: obligation.id,
            payload: {
              organizationId: input.organizationId,
              obligationId: obligation.id,
              ledgerTransactionId: transaction.id,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response };
      });
    } catch (error) {
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) return { kind: "duplicate" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as RentObligationCreated };
    }
  }

  async recordPayment(input: PaymentInput): Promise<PaymentResult> {
    const scope = `rent.payment.record.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (!["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"].includes(membership.role))
          return { kind: "forbidden" };
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
            return { kind: "idempotency_conflict" };
          return { kind: "replayed", response: existing.response as unknown as PaymentRecorded };
        }
        const obligations = await tx.rentObligation.findMany({
          where: {
            organizationId: input.organizationId,
            id: { in: input.allocations.map((item) => item.rentObligationId) },
            status: { in: ["OPEN", "PARTIALLY_PAID"] },
          },
          select: {
            id: true,
            amountMinor: true,
            version: true,
            lease: { select: { tenantProfileId: true } },
            allocations: { select: { amountMinor: true } },
          },
        });
        if (obligations.length !== input.allocations.length) return { kind: "allocation_invalid" };
        const tenantIds = new Set(obligations.map((item) => item.lease.tenantProfileId));
        if (tenantIds.size !== 1) return { kind: "tenant_mismatch" };
        const allocationsById = new Map(
          input.allocations.map((item) => [item.rentObligationId, item.amountMinor]),
        );
        for (const obligation of obligations) {
          const alreadyAllocated = obligation.allocations.reduce(
            (sum, item) => sum + item.amountMinor,
            0,
          );
          const incoming = allocationsById.get(obligation.id) ?? 0;
          if (incoming <= 0 || alreadyAllocated + incoming > obligation.amountMinor)
            return { kind: "allocation_invalid" };
        }
        const amountMinor = input.allocations.reduce((sum, item) => sum + item.amountMinor, 0);
        const tenantProfileId = obligations[0]?.lease.tenantProfileId;
        if (!tenantProfileId) return { kind: "allocation_invalid" };
        const payment = await tx.payment.create({
          data: {
            organizationId: input.organizationId,
            tenantProfileId,
            amountMinor,
            method: input.method,
            receivedAt: input.receivedAt,
            ...(input.externalReference ? { externalReference: input.externalReference } : {}),
          },
          select: { id: true, createdAt: true },
        });
        await tx.paymentAllocation.createMany({
          data: input.allocations.map((item) => ({
            organizationId: input.organizationId,
            paymentId: payment.id,
            rentObligationId: item.rentObligationId,
            amountMinor: item.amountMinor,
          })),
        });
        for (const obligation of obligations) {
          const alreadyAllocated = obligation.allocations.reduce(
            (sum, item) => sum + item.amountMinor,
            0,
          );
          const totalAllocated = alreadyAllocated + (allocationsById.get(obligation.id) ?? 0);
          const updated = await tx.rentObligation.updateMany({
            where: {
              id: obligation.id,
              organizationId: input.organizationId,
              version: obligation.version,
              status: { in: ["OPEN", "PARTIALLY_PAID"] },
            },
            data: {
              status: totalAllocated === obligation.amountMinor ? "PAID" : "PARTIALLY_PAID",
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) throw new Error("PAYMENT_ALLOCATION_RACE");
        }
        const ledger = await tx.ledgerTransaction.create({
          data: {
            organizationId: input.organizationId,
            paymentId: payment.id,
            description: `Payment ${input.receiptNumber}`,
            correlationId: input.correlationId,
          },
          select: { id: true },
        });
        const entries = [
          {
            organizationId: input.organizationId,
            transactionId: ledger.id,
            accountCode: "CASH",
            direction: "DEBIT" as const,
            amountMinor,
          },
          {
            organizationId: input.organizationId,
            transactionId: ledger.id,
            accountCode: "RENT_RECEIVABLE",
            direction: "CREDIT" as const,
            amountMinor,
          },
        ];

        assertLedgerBalanced(entries);

        await tx.ledgerEntry.createMany({ data: entries });
        const receipt = await tx.receipt.create({
          data: {
            organizationId: input.organizationId,
            paymentId: payment.id,
            receiptNumber: input.receiptNumber,
          },
          select: { id: true, receiptNumber: true, issuedAt: true },
        });
        await tx.reconciliationItem.create({
          data: {
            organizationId: input.organizationId,
            kind: "PAYMENT_REVIEW",
            paymentId: payment.id,
          },
        });
        const response: PaymentRecorded = {
          id: payment.id,
          tenantProfileId,
          amountMinor,
          currencyCode: "USD",
          method: input.method,
          status: "POSTED",
          receivedAt: input.receivedAt.toISOString(),
          allocations: input.allocations,
          ledgerTransactionId: ledger.id,
          ledgerBalanced: true,
          receipt: {
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            issuedAt: receipt.issuedAt.toISOString(),
          },
        };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "rent.payment.recorded",
            targetType: "Payment",
            targetId: payment.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { amountMinor, receiptNumber: receipt.receiptNumber },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: "PaymentRecorded",
            aggregateType: "Payment",
            aggregateId: payment.id,
            payload: {
              organizationId: input.organizationId,
              paymentId: payment.id,
              receiptId: receipt.id,
              amountMinor,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PAYMENT_ALLOCATION_RACE")
        return { kind: "concurrent" };
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) return { kind: "concurrent" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as PaymentRecorded };
    }
  }

  async recordRefund(input: RefundInput): Promise<RefundResult> {
    const scope = `rent.refund.record.v1:${input.organizationId}:${input.paymentId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (!["OWNER", "ACCOUNTANT"].includes(membership.role)) return { kind: "forbidden" };
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
            return { kind: "idempotency_conflict" };
          return { kind: "replayed", response: existing.response as unknown as RefundRecorded };
        }
        const payment = await tx.payment.findFirst({
          where: { id: input.paymentId, organizationId: input.organizationId },
          select: {
            id: true,
            allocations: {
              where: { id: { in: input.allocations.map((item) => item.paymentAllocationId) } },
              select: {
                id: true,
                amountMinor: true,
                refundAllocations: { select: { amountMinor: true } },
                rentObligation: {
                  select: {
                    id: true,
                    amountMinor: true,
                    version: true,
                    allocations: {
                      select: {
                        id: true,
                        amountMinor: true,
                        refundAllocations: { select: { amountMinor: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        });
        if (!payment || payment.allocations.length !== input.allocations.length)
          return { kind: "not_found" };
        const incoming = new Map(
          input.allocations.map((item) => [item.paymentAllocationId, item.amountMinor]),
        );
        for (const allocation of payment.allocations) {
          const refunded = allocation.refundAllocations.reduce(
            (sum, item) => sum + item.amountMinor,
            0,
          );
          const amount = incoming.get(allocation.id) ?? 0;
          if (amount <= 0 || refunded + amount > allocation.amountMinor)
            return { kind: "allocation_invalid" };
        }
        const amountMinor = input.allocations.reduce((sum, item) => sum + item.amountMinor, 0);
        const refund = await tx.refund.create({
          data: {
            organizationId: input.organizationId,
            paymentId: input.paymentId,
            amountMinor,
            reason: input.reason,
            refundedAt: input.refundedAt,
          },
          select: { id: true },
        });
        await tx.refundAllocation.createMany({
          data: input.allocations.map((item) => ({
            organizationId: input.organizationId,
            refundId: refund.id,
            paymentAllocationId: item.paymentAllocationId,
            amountMinor: item.amountMinor,
          })),
        });
        const obligations = new Map(
          payment.allocations.map((allocation) => [
            allocation.rentObligation.id,
            allocation.rentObligation,
          ]),
        );
        for (const obligation of obligations.values()) {
          const netAllocated = obligation.allocations.reduce((sum, allocation) => {
            const refunded = allocation.refundAllocations.reduce(
              (subtotal, item) => subtotal + item.amountMinor,
              0,
            );
            return sum + allocation.amountMinor - refunded - (incoming.get(allocation.id) ?? 0);
          }, 0);
          const status =
            netAllocated <= 0
              ? "OPEN"
              : netAllocated >= obligation.amountMinor
                ? "PAID"
                : "PARTIALLY_PAID";
          const updated = await tx.rentObligation.updateMany({
            where: {
              id: obligation.id,
              organizationId: input.organizationId,
              version: obligation.version,
            },
            data: { status, version: { increment: 1 } },
          });
          if (updated.count !== 1) throw new Error("REFUND_ALLOCATION_RACE");
        }
        const ledger = await tx.ledgerTransaction.create({
          data: {
            organizationId: input.organizationId,
            refundId: refund.id,
            description: `Refund ${refund.id}`,
            correlationId: input.correlationId,
          },
          select: { id: true },
        });
        const entries = [
          {
            organizationId: input.organizationId,
            transactionId: ledger.id,
            accountCode: "RENT_RECEIVABLE",
            direction: "DEBIT" as const,
            amountMinor,
          },
          {
            organizationId: input.organizationId,
            transactionId: ledger.id,
            accountCode: "CASH",
            direction: "CREDIT" as const,
            amountMinor,
          },
        ];

        assertLedgerBalanced(entries);

        await tx.ledgerEntry.createMany({ data: entries });
        const reconciliation = await tx.reconciliationItem.create({
          data: {
            organizationId: input.organizationId,
            kind: "REFUND_REVIEW",
            refundId: refund.id,
          },
          select: { id: true },
        });
        const response: RefundRecorded = {
          id: refund.id,
          paymentId: input.paymentId,
          amountMinor,
          currencyCode: "USD",
          reason: input.reason,
          status: "POSTED",
          refundedAt: input.refundedAt.toISOString(),
          allocations: input.allocations,
          ledgerTransactionId: ledger.id,
          ledgerBalanced: true,
          reconciliationItemId: reconciliation.id,
        };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "rent.refund.recorded",
            targetType: "Refund",
            targetId: refund.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { paymentId: input.paymentId, amountMinor },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: "RefundRecorded",
            aggregateType: "Refund",
            aggregateId: refund.id,
            payload: {
              organizationId: input.organizationId,
              refundId: refund.id,
              paymentId: input.paymentId,
              amountMinor,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "REFUND_ALLOCATION_RACE")
        return { kind: "concurrent" };
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) return { kind: "concurrent" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as RefundRecorded };
    }
  }

  async resolveReconciliation(input: {
    organizationId: string;
    actorUserId: string;
    itemId: string;
    expectedVersion: number;
    correlationId: string;
  }) {
    return this.database.$transaction(async (tx) => {
      const membership = await tx.membership.findFirst({
        where: {
          organizationId: input.organizationId,
          userId: input.actorUserId,
          status: "ACTIVE",
          role: { in: ["OWNER", "ACCOUNTANT"] },
        },
        select: { id: true },
      });
      if (!membership) return { kind: "not_found" as const };
      const item = await tx.reconciliationItem.findFirst({
        where: { id: input.itemId, organizationId: input.organizationId },
        select: { status: true, version: true },
      });
      if (!item) return { kind: "not_found" as const };
      if (item.status === "RESOLVED")
        return {
          kind: "resolved" as const,
          response: { id: input.itemId, status: "RESOLVED", version: Number(item.version) },
        };
      if (Number(item.version) !== input.expectedVersion)
        return { kind: "version_mismatch" as const, currentVersion: Number(item.version) };
      const updated = await tx.reconciliationItem.updateMany({
        where: {
          id: input.itemId,
          organizationId: input.organizationId,
          status: "OPEN",
          version: item.version,
        },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: input.actorUserId,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) return { kind: "concurrent" as const };
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "rent.reconciliation.resolved",
          targetType: "ReconciliationItem",
          targetId: input.itemId,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
        },
      });
      return {
        kind: "resolved" as const,
        response: { id: input.itemId, status: "RESOLVED", version: Number(item.version) + 1 },
      };
    });
  }
}
