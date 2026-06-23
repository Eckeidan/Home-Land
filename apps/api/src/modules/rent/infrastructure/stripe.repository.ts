import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";

@Injectable()
export class StripeRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async prepare(
    organizationId: string,
    actorUserId: string,
    allocations: Array<{ rentObligationId: string; amountMinor: number }>,
  ) {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: { role: true, organization: { select: { status: true } } },
    });
    if (!membership) return { kind: "not_found" as const };
    if (!["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"].includes(membership.role))
      return { kind: "forbidden" as const };
    if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" as const };
    const obligations = await this.database.rentObligation.findMany({
      where: {
        organizationId,
        id: { in: allocations.map((item) => item.rentObligationId) },
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      select: {
        id: true,
        amountMinor: true,
        lease: { select: { tenantProfileId: true } },
        allocations: {
          select: { amountMinor: true, refundAllocations: { select: { amountMinor: true } } },
        },
      },
    });
    if (obligations.length !== allocations.length) return { kind: "allocation_invalid" as const };
    if (new Set(obligations.map((item) => item.lease.tenantProfileId)).size !== 1)
      return { kind: "tenant_mismatch" as const };
    const requested = new Map(allocations.map((item) => [item.rentObligationId, item.amountMinor]));
    for (const obligation of obligations) {
      const net = obligation.allocations.reduce(
        (sum, allocation) =>
          sum +
          allocation.amountMinor -
          allocation.refundAllocations.reduce(
            (subtotal, refund) => subtotal + refund.amountMinor,
            0,
          ),
        0,
      );
      if (
        (requested.get(obligation.id) ?? 0) <= 0 ||
        net + (requested.get(obligation.id) ?? 0) > obligation.amountMinor
      )
        return { kind: "allocation_invalid" as const };
    }
    return {
      kind: "prepared" as const,
      tenantProfileId: obligations[0]?.lease.tenantProfileId as string,
      amountMinor: allocations.reduce((sum, item) => sum + item.amountMinor, 0),
    };
  }

  async persistIntent(input: {
    organizationId: string;
    actorUserId: string;
    tenantProfileId: string;
    stripeId: string;
    status: "REQUIRES_PAYMENT_METHOD" | "PROCESSING";
    amountMinor: number;
    allocations: Array<{ rentObligationId: string; amountMinor: number }>;
    keyHash: Uint8Array<ArrayBuffer>;
    requestHash: Uint8Array<ArrayBuffer>;
    correlationId: string;
  }) {
    const scope = `stripe.payment-intent.create.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (tx) => {
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
            return { kind: "idempotency_conflict" as const };
          return {
            kind: "replayed" as const,
            response: existing.response as {
              id: string;
              stripePaymentIntentId: string;
              status: string;
              amountMinor: number;
            },
          };
        }
        const intent = await tx.stripePaymentIntent.create({
          data: {
            organizationId: input.organizationId,
            tenantProfileId: input.tenantProfileId,
            stripePaymentIntentId: input.stripeId,
            amountMinor: input.amountMinor,
            status: input.status,
            allocations: {
              create: input.allocations.map((allocation) => ({
                organizationId: input.organizationId,
                rentObligationId: allocation.rentObligationId,
                amountMinor: allocation.amountMinor,
              })),
            },
          },
          select: { id: true, stripePaymentIntentId: true, status: true, amountMinor: true },
        });
        const response = { ...intent };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "stripe.payment-intent.created",
            targetType: "StripePaymentIntent",
            targetId: intent.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { amountMinor: input.amountMinor },
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
        return { kind: "created" as const, response };
      });
    } catch (error) {
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const intent = await this.database.stripePaymentIntent.findUnique({
        where: { stripePaymentIntentId: input.stripeId },
        select: { id: true, stripePaymentIntentId: true, status: true, amountMinor: true },
      });
      return intent
        ? { kind: "replayed" as const, response: intent }
        : { kind: "concurrent" as const };
    }
  }

  async processWebhook(input: {
    eventId: string;
    eventType: string;
    stripePaymentIntentId?: string;
    payloadHash: Uint8Array<ArrayBuffer>;
    correlationId: string;
  }) {
    try {
      return await this.database.$transaction(async (tx) => {
        const event = await tx.stripeWebhookEvent.create({
          data: {
            stripeEventId: input.eventId,
            eventType: input.eventType,
            payloadHash: input.payloadHash,
          },
          select: { id: true },
        });
        const statusEvents: Record<string, "PROCESSING" | "CANCELED" | "REQUIRES_PAYMENT_METHOD"> =
          {
            "payment_intent.processing": "PROCESSING",
            "payment_intent.canceled": "CANCELED",
            "payment_intent.payment_failed": "REQUIRES_PAYMENT_METHOD",
          };
        const nextStatus = statusEvents[input.eventType];
        if (nextStatus && input.stripePaymentIntentId) {
          await tx.stripePaymentIntent.updateMany({
            where: { stripePaymentIntentId: input.stripePaymentIntentId, paymentId: null },
            data: { status: nextStatus, version: { increment: 1 } },
          });
          await tx.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
          return { kind: "processed" as const, automaticallyAllocated: false };
        }
        if (input.eventType !== "payment_intent.succeeded" || !input.stripePaymentIntentId) {
          await tx.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
          return { kind: "ignored" as const };
        }
        const intent = await tx.stripePaymentIntent.findUnique({
          where: { stripePaymentIntentId: input.stripePaymentIntentId },
          select: {
            id: true,
            organizationId: true,
            tenantProfileId: true,
            paymentId: true,
            amountMinor: true,
            status: true,
            allocations: {
              select: {
                rentObligationId: true,
                amountMinor: true,
                rentObligation: {
                  select: {
                    amountMinor: true,
                    version: true,
                    allocations: {
                      select: {
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
        if (!intent) {
          await tx.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { status: "FAILED", processedAt: new Date(), errorCode: "INTENT_NOT_FOUND" },
          });
          return { kind: "failed" as const };
        }
        if (intent.paymentId) {
          await tx.stripeWebhookEvent.update({
            where: { id: event.id },
            data: { status: "PROCESSED", processedAt: new Date() },
          });
          return { kind: "replayed" as const };
        }
        const valid = intent.allocations.every((allocation) => {
          const net = allocation.rentObligation.allocations.reduce(
            (sum, item) =>
              sum +
              item.amountMinor -
              item.refundAllocations.reduce((subtotal, refund) => subtotal + refund.amountMinor, 0),
            0,
          );
          return net + allocation.amountMinor <= allocation.rentObligation.amountMinor;
        });
        const payment = await tx.payment.create({
          data: {
            organizationId: intent.organizationId,
            tenantProfileId: intent.tenantProfileId,
            amountMinor: intent.amountMinor,
            method: "STRIPE",
            externalReference: input.stripePaymentIntentId,
            receivedAt: new Date(),
          },
          select: { id: true },
        });
        if (valid) {
          await tx.paymentAllocation.createMany({
            data: intent.allocations.map((allocation) => ({
              organizationId: intent.organizationId,
              paymentId: payment.id,
              rentObligationId: allocation.rentObligationId,
              amountMinor: allocation.amountMinor,
            })),
          });
          for (const allocation of intent.allocations) {
            const obligation = allocation.rentObligation;
            const previous = obligation.allocations.reduce(
              (sum, item) =>
                sum +
                item.amountMinor -
                item.refundAllocations.reduce(
                  (subtotal, refund) => subtotal + refund.amountMinor,
                  0,
                ),
              0,
            );
            await tx.rentObligation.updateMany({
              where: {
                id: allocation.rentObligationId,
                organizationId: intent.organizationId,
                version: obligation.version,
              },
              data: {
                status:
                  previous + allocation.amountMinor === obligation.amountMinor
                    ? "PAID"
                    : "PARTIALLY_PAID",
                version: { increment: 1 },
              },
            });
          }
        }
        const ledger = await tx.ledgerTransaction.create({
          data: {
            organizationId: intent.organizationId,
            paymentId: payment.id,
            description: `Stripe ${input.stripePaymentIntentId}`,
            correlationId: input.correlationId,
          },
          select: { id: true },
        });
        await tx.ledgerEntry.createMany({
          data: [
            {
              organizationId: intent.organizationId,
              transactionId: ledger.id,
              accountCode: "CASH",
              direction: "DEBIT",
              amountMinor: intent.amountMinor,
            },
            {
              organizationId: intent.organizationId,
              transactionId: ledger.id,
              accountCode: valid ? "RENT_RECEIVABLE" : "TENANT_CREDIT",
              direction: "CREDIT",
              amountMinor: intent.amountMinor,
            },
          ],
        });
        await tx.receipt.create({
          data: {
            organizationId: intent.organizationId,
            paymentId: payment.id,
            receiptNumber: `STRIPE-${input.eventId.slice(-16).toUpperCase()}`,
          },
        });
        await tx.reconciliationItem.create({
          data: {
            organizationId: intent.organizationId,
            kind: "PAYMENT_REVIEW",
            paymentId: payment.id,
            status: valid ? "RESOLVED" : "OPEN",
            ...(valid ? { resolvedAt: new Date() } : {}),
          },
        });
        await tx.stripePaymentIntent.update({
          where: { id: intent.id },
          data: { status: "SUCCEEDED", paymentId: payment.id, version: { increment: 1 } },
        });
        await tx.stripeWebhookEvent.update({
          where: { id: event.id },
          data: { status: "PROCESSED", processedAt: new Date() },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: intent.organizationId,
            action: "stripe.payment-intent.reconciled",
            targetType: "Payment",
            targetId: payment.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { automaticallyAllocated: valid },
          },
        });
        return { kind: "processed" as const, automaticallyAllocated: valid };
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
        return { kind: "replayed" as const };
      throw error;
    }
  }
}
