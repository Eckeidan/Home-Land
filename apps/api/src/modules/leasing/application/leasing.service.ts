import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import { leaseTerm } from "../domain/lease-term.js";
import type {
  CreateLeaseDraftCommand,
  CreateTenantCommand,
  LeaseTransitionCommand,
} from "../domain/leasing.types.js";
import { rentAmount } from "../domain/rent-amount.js";
import { securityDeposit } from "../domain/security-deposit.js";
import { LeasingRepository } from "../infrastructure/leasing.repository.js";
import { TenantInvitationMailerService } from "../infrastructure/tenant-invitation-mailer.service.js";

@Injectable()
export class LeasingService {
  constructor(
    @Inject(LeasingRepository) private readonly repository: LeasingRepository,
    @Inject(TenantInvitationMailerService) private readonly mailer: TenantInvitationMailerService,
  ) {}

  snapshot(organizationId: string, actorUserId: string) {
    return this.repository.snapshot(organizationId, actorUserId).then((value) => {
      if (!value)
        throw new NotFoundException(
          this.problem(404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
        );
      return value;
    });
  }

  async createTenant(command: CreateTenantCommand) {
    const email = command.email.trim().toLowerCase();
    const token = command.sendInvitation ? randomBytes(32).toString("base64url") : undefined;
    const normalized = {
      firstName: this.space(command.firstName),
      lastName: this.space(command.lastName),
      email,
      ...(command.phone?.trim() ? { phone: command.phone.trim() } : {}),
      sendInvitation: command.sendInvitation,
    };
    const result = await this.repository.createTenant({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      ...normalized,
      ...(token ? { tokenHash: this.hash(token) } : {}),
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });
    if (result.kind === "created" && token && result.organizationName)
      void this.mailer
        .send({ email, token, organizationName: result.organizationName })
        .catch(() => undefined);
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    throw this.map(result.kind, command.correlationId, "tenant");
  }

  async createLease(command: CreateLeaseDraftCommand) {
    let term: ReturnType<typeof leaseTerm>;

    try {
      term = leaseTerm(command.startDate, command.endDate);
    } catch {
      throw new BadRequestException(
        this.problem(
          400,
          "LEASE_DATES_INVALID",
          "Lease start date must precede end date",
          command.correlationId,
        ),
      );
    }

    let rent: ReturnType<typeof rentAmount>;
    let deposit: ReturnType<typeof securityDeposit>;

    try {
      rent = rentAmount(command.monthlyRentMinor);
      deposit = securityDeposit(command.securityDepositMinor);
    } catch {
      throw new BadRequestException(
        this.problem(
          400,
          "LEASE_FINANCIALS_INVALID",
          "Lease financial values are invalid",
          command.correlationId,
        ),
      );
    }
    const normalized = {
      propertyId: command.propertyId,
      unitId: command.unitId,
      tenantProfileId: command.tenantProfileId,
      startDate: command.startDate,
      endDate: command.endDate,
      monthlyRentMinor: rent.amountMinor,
      securityDepositMinor: deposit.amountMinor,
      rentDueDay: command.rentDueDay,
    };
    const result = await this.repository.createLease({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      ...normalized,
      startDate: term.startDate,
      endDate: term.endDate,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    throw this.map(result.kind, command.correlationId, "lease");
  }

  validateLease(command: LeaseTransitionCommand) {
    return this.transitionLease(command, false);
  }

  activateLease(command: LeaseTransitionCommand) {
    return this.transitionLease(command, true);
  }

  markLeaseRenewal(command: LeaseTransitionCommand) {
    return this.lifecycleLease(command, false);
  }

  terminateLease(command: LeaseTransitionCommand) {
    return this.lifecycleLease(command, true);
  }

  private async lifecycleLease(command: LeaseTransitionCommand, terminate: boolean) {
    const input = {
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      leaseId: command.leaseId,
      expectedVersion: command.expectedVersion,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify({ expectedVersion: command.expectedVersion })),
      correlationId: command.correlationId,
    };
    const result = terminate
      ? await this.repository.terminateLease(input)
      : await this.repository.markLeaseRenewal(input);
    if (result.kind === "transitioned" || result.kind === "replayed") return result.response;
    if (result.kind === "version_mismatch")
      throw new PreconditionFailedException({
        ...this.problem(
          412,
          "VERSION_MISMATCH",
          "Lease version does not match",
          command.correlationId,
        ),
        currentVersion: result.currentVersion,
      });
    if (result.kind === "state_invalid")
      throw new ConflictException(
        this.problem(
          409,
          "LEASE_TRANSITION_INVALID",
          "Only an active lease supports this command",
          command.correlationId,
        ),
      );
    throw this.map(result.kind, command.correlationId, "lease");
  }

  private async transitionLease(command: LeaseTransitionCommand, activate: boolean) {
    const input = {
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      leaseId: command.leaseId,
      expectedVersion: command.expectedVersion,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify({ expectedVersion: command.expectedVersion })),
      correlationId: command.correlationId,
    };
    const result = activate
      ? await this.repository.activateLease(input)
      : await this.repository.validateLease(input);
    if (result.kind === "transitioned" || result.kind === "replayed") return result.response;
    if (result.kind === "version_mismatch")
      throw new PreconditionFailedException({
        ...this.problem(
          412,
          "VERSION_MISMATCH",
          "Lease version does not match",
          command.correlationId,
        ),
        currentVersion: result.currentVersion,
      });
    const transitions: Record<string, [number, string, string]> = {
      requirements_incomplete: [
        409,
        "LEASE_REQUIREMENTS_INCOMPLETE",
        "Tenant must be active and unit available",
      ],
      state_invalid: [409, "LEASE_TRANSITION_INVALID", "Lease cannot perform this transition"],
    };
    const specific = transitions[result.kind];
    if (specific) {
      const [status, code, title] = specific;
      throw new ConflictException(this.problem(status, code, title, command.correlationId));
    }
    throw this.map(result.kind, command.correlationId, "lease");
  }

  async acceptInvitation(token: string, correlationId: string) {
    const result = await this.repository.acceptInvitation(this.hash(token), correlationId);
    if (result.kind === "invalid")
      throw new BadRequestException(
        this.problem(
          400,
          "TENANT_INVITATION_INVALID",
          "Invitation is invalid or expired",
          correlationId,
        ),
      );
    return { status: "ACCEPTED" };
  }

  private map(kind: string, correlationId: string, resource: "tenant" | "lease") {
    const values: Record<string, [number, string, string]> = {
      not_found: [
        404,
        resource === "lease" ? "LEASE_RESOURCE_NOT_FOUND" : "ORGANIZATION_NOT_FOUND",
        "Required resource was not found",
      ],
      forbidden: [403, "LEASING_WRITE_FORBIDDEN", "Leasing write is not permitted"],
      workspace_inactive: [409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"],
      duplicate: [409, "TENANT_EMAIL_EXISTS", "Tenant email already exists"],
      unit_unavailable: [409, "UNIT_NOT_AVAILABLE", "Unit is not available"],
      idempotency_conflict: [409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"],
      concurrent: [409, "LEASING_CONCURRENT_REQUEST", "Another request is being processed"],
    };
    const [status, code, title] = values[kind] ?? [
      409,
      "LEASING_CONFLICT",
      "Leasing request conflicted",
    ];
    const body = this.problem(status, code, title, correlationId);
    if (status === 404) return new NotFoundException(body);
    if (status === 403) return new ForbiddenException(body);
    return new ConflictException(body);
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value).digest());
  }
  private space(value: string) {
    return value.trim().replace(/\s+/g, " ");
  }
  private problem(status: number, code: string, title: string, correlationId?: string) {
    return { type: "/problems/leasing", title, status, code, correlationId };
  }
}
