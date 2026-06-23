import { createHash, randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateRentObligationCommand,
  RecordPaymentCommand,
  RecordRefundCommand,
} from "../domain/rent.types.js";
import { RentRepository } from "../infrastructure/rent.repository.js";
@Injectable()
export class RentService {
  constructor(@Inject(RentRepository) private readonly repository: RentRepository) {}
  async snapshot(organizationId: string, actorUserId: string) {
    const result = await this.repository.snapshot(organizationId, actorUserId);
    if (result.kind === "not_found")
      throw new NotFoundException(
        this.problem(404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
      );
    if (result.kind === "forbidden")
      throw new ForbiddenException(
        this.problem(403, "RENT_READ_FORBIDDEN", "Rent operations are not permitted"),
      );
    return result.snapshot;
  }
  async create(command: CreateRentObligationCommand) {
    const [yearText, monthText] = command.period.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    )
      throw new ConflictException(
        this.problem(409, "RENT_PERIOD_INVALID", "Rent period is invalid", command.correlationId),
      );
    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0));
    const result = await this.repository.create({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      leaseId: command.leaseId,
      period: command.period,
      periodStart,
      periodEnd,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify({ leaseId: command.leaseId, period: command.period })),
      correlationId: command.correlationId,
    });
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    const errors: Record<string, [number, string, string]> = {
      not_found: [404, "LEASE_NOT_FOUND", "Lease was not found"],
      forbidden: [403, "RENT_WRITE_FORBIDDEN", "Rent operation is not permitted"],
      workspace_inactive: [409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"],
      lease_inactive: [409, "LEASE_NOT_ACTIVE", "Rent obligations require an active lease"],
      period_not_covered: [
        409,
        "LEASE_PERIOD_NOT_COVERED",
        "Lease does not cover the complete rent period",
      ],
      duplicate: [409, "RENT_OBLIGATION_EXISTS", "Rent obligation already exists"],
      idempotency_conflict: [409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"],
      concurrent: [409, "RENT_CONCURRENT_REQUEST", "Another rent request is being processed"],
    };
    const [status, code, title] = errors[result.kind] ?? [
      409,
      "RENT_CONFLICT",
      "Rent operation conflicted",
    ];
    const body = this.problem(status, code, title, command.correlationId);
    if (status === 404) throw new NotFoundException(body);
    if (status === 403) throw new ForbiddenException(body);
    throw new ConflictException(body);
  }
  async recordPayment(command: RecordPaymentCommand) {
    const receivedAt = new Date(command.receivedAt);
    if (
      !Number.isFinite(receivedAt.valueOf()) ||
      receivedAt > new Date(Date.now() + 5 * 60_000) ||
      command.allocations.length === 0 ||
      new Set(command.allocations.map((item) => item.rentObligationId)).size !==
        command.allocations.length
    )
      throw new ConflictException(
        this.problem(
          409,
          "PAYMENT_INPUT_INVALID",
          "Payment input is invalid",
          command.correlationId,
        ),
      );
    const normalized = {
      method: command.method,
      receivedAt: receivedAt.toISOString(),
      ...(command.externalReference?.trim()
        ? { externalReference: command.externalReference.trim() }
        : {}),
      allocations: [...command.allocations].sort((a, b) =>
        a.rentObligationId.localeCompare(b.rentObligationId),
      ),
    };
    const result = await this.repository.recordPayment({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      ...normalized,
      receivedAt,
      receiptNumber: `RCP-${randomBytes(8).toString("hex").toUpperCase()}`,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    const errors: Record<string, [number, string, string]> = {
      not_found: [404, "PAYMENT_RESOURCE_NOT_FOUND", "Payment resource was not found"],
      forbidden: [403, "PAYMENT_WRITE_FORBIDDEN", "Payment operation is not permitted"],
      workspace_inactive: [409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"],
      allocation_invalid: [
        409,
        "PAYMENT_ALLOCATION_INVALID",
        "Allocation exceeds an open obligation",
      ],
      tenant_mismatch: [
        409,
        "PAYMENT_TENANT_MISMATCH",
        "All allocations must belong to one tenant",
      ],
      idempotency_conflict: [409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"],
      concurrent: [409, "PAYMENT_CONCURRENT_REQUEST", "Another payment request is being processed"],
    };
    const [status, code, title] = errors[result.kind] ?? [
      409,
      "PAYMENT_CONFLICT",
      "Payment operation conflicted",
    ];
    const body = this.problem(status, code, title, command.correlationId);
    if (status === 404) throw new NotFoundException(body);
    if (status === 403) throw new ForbiddenException(body);
    throw new ConflictException(body);
  }
  async recordRefund(command: RecordRefundCommand) {
    const refundedAt = new Date(command.refundedAt);
    if (
      !Number.isFinite(refundedAt.valueOf()) ||
      refundedAt > new Date(Date.now() + 5 * 60_000) ||
      command.allocations.length === 0 ||
      new Set(command.allocations.map((item) => item.paymentAllocationId)).size !==
        command.allocations.length
    )
      throw new ConflictException(
        this.problem(409, "REFUND_INPUT_INVALID", "Refund input is invalid", command.correlationId),
      );
    const normalized = {
      reason: command.reason.trim().replace(/\s+/g, " "),
      refundedAt: refundedAt.toISOString(),
      allocations: [...command.allocations].sort((a, b) =>
        a.paymentAllocationId.localeCompare(b.paymentAllocationId),
      ),
    };
    const result = await this.repository.recordRefund({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      paymentId: command.paymentId,
      ...normalized,
      refundedAt,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify({ paymentId: command.paymentId, ...normalized })),
      correlationId: command.correlationId,
    });
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    const errors: Record<string, [number, string, string]> = {
      not_found: [404, "REFUND_RESOURCE_NOT_FOUND", "Payment or allocation was not found"],
      forbidden: [403, "REFUND_WRITE_FORBIDDEN", "Refund is not permitted"],
      workspace_inactive: [409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"],
      allocation_invalid: [
        409,
        "REFUND_ALLOCATION_INVALID",
        "Refund exceeds the original allocation",
      ],
      idempotency_conflict: [409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"],
      concurrent: [409, "REFUND_CONCURRENT_REQUEST", "Another refund is being processed"],
    };
    const [status, code, title] = errors[result.kind] ?? [
      409,
      "REFUND_CONFLICT",
      "Refund conflicted",
    ];
    const body = this.problem(status, code, title, command.correlationId);
    if (status === 404) throw new NotFoundException(body);
    if (status === 403) throw new ForbiddenException(body);
    throw new ConflictException(body);
  }
  async resolveReconciliation(command: {
    organizationId: string;
    actorUserId: string;
    itemId: string;
    expectedVersion: number;
    correlationId: string;
  }) {
    const result = await this.repository.resolveReconciliation(command);
    if (result.kind === "resolved") return result.response;
    if (result.kind === "not_found")
      throw new NotFoundException(
        this.problem(
          404,
          "RECONCILIATION_ITEM_NOT_FOUND",
          "Reconciliation item was not found",
          command.correlationId,
        ),
      );
    if (result.kind === "version_mismatch")
      throw new ConflictException({
        ...this.problem(
          409,
          "VERSION_MISMATCH",
          "Reconciliation version does not match",
          command.correlationId,
        ),
        currentVersion: result.currentVersion,
      });
    throw new ConflictException(
      this.problem(
        409,
        "RECONCILIATION_CONCURRENT",
        "Reconciliation item changed concurrently",
        command.correlationId,
      ),
    );
  }
  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value).digest());
  }
  private problem(status: number, code: string, title: string, correlationId?: string) {
    return { type: "/problems/rent", title, status, code, correlationId };
  }
}
