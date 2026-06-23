import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { StripeRepository } from "../infrastructure/stripe.repository.js";
import { StripeGatewayService } from "../infrastructure/stripe-gateway.service.js";

@Injectable()
export class StripeService {
  constructor(
    @Inject(StripeRepository) private readonly repository: StripeRepository,
    @Inject(StripeGatewayService) private readonly gateway: StripeGatewayService,
  ) {}
  async createIntent(command: {
    organizationId: string;
    actorUserId: string;
    allocations: Array<{ rentObligationId: string; amountMinor: number }>;
    idempotencyKey: string;
    correlationId: string;
  }) {
    if (
      new Set(command.allocations.map((item) => item.rentObligationId)).size !==
      command.allocations.length
    )
      throw new ConflictException(
        this.problem(
          409,
          "STRIPE_ALLOCATION_INVALID",
          "Stripe allocations are invalid",
          command.correlationId,
        ),
      );
    const prepared = await this.repository.prepare(
      command.organizationId,
      command.actorUserId,
      command.allocations,
    );
    if (prepared.kind !== "prepared") throw this.map(prepared.kind, command.correlationId);
    const provider = await this.gateway.createPaymentIntent({
      amountMinor: prepared.amountMinor,
      idempotencyKey: command.idempotencyKey,
      organizationId: command.organizationId,
    });
    const status = provider.status === "processing" ? "PROCESSING" : "REQUIRES_PAYMENT_METHOD";
    const normalized = {
      allocations: [...command.allocations].sort((a, b) =>
        a.rentObligationId.localeCompare(b.rentObligationId),
      ),
    };
    const result = await this.repository.persistIntent({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      tenantProfileId: prepared.tenantProfileId,
      stripeId: provider.id,
      status,
      amountMinor: prepared.amountMinor,
      allocations: normalized.allocations,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });
    if (result.kind === "idempotency_conflict")
      throw new ConflictException(
        this.problem(
          409,
          "IDEMPOTENCY_KEY_REUSED",
          "Idempotency key was already used",
          command.correlationId,
        ),
      );
    if (result.kind === "concurrent")
      throw new ConflictException(
        this.problem(
          409,
          "STRIPE_INTENT_CONCURRENT",
          "Payment intent is being created",
          command.correlationId,
        ),
      );
    return { ...result.response, clientSecret: provider.clientSecret };
  }
  async webhook(rawBody: Buffer, signature: string | undefined, correlationId: string) {
    this.gateway.verifyWebhook(rawBody, signature);
    let event: { id?: string; type?: string; data?: { object?: { id?: string } } };
    try {
      event = JSON.parse(rawBody.toString("utf8")) as typeof event;
    } catch {
      throw new ConflictException(
        this.problem(400, "STRIPE_EVENT_INVALID", "Webhook payload is invalid", correlationId),
      );
    }
    if (!event.id || !event.type)
      throw new ConflictException(
        this.problem(400, "STRIPE_EVENT_INVALID", "Webhook payload is invalid", correlationId),
      );
    return this.repository.processWebhook({
      eventId: event.id,
      eventType: event.type,
      ...(event.data?.object?.id ? { stripePaymentIntentId: event.data.object.id } : {}),
      payloadHash: this.hashBytes(rawBody),
      correlationId,
    });
  }
  private map(kind: string, correlationId: string) {
    const body =
      kind === "not_found"
        ? this.problem(404, "ORGANIZATION_NOT_FOUND", "Organization was not found", correlationId)
        : kind === "forbidden"
          ? this.problem(
              403,
              "STRIPE_WRITE_FORBIDDEN",
              "Stripe operation is not permitted",
              correlationId,
            )
          : this.problem(
              409,
              kind === "tenant_mismatch"
                ? "PAYMENT_TENANT_MISMATCH"
                : kind === "workspace_inactive"
                  ? "WORKSPACE_NOT_ACTIVE"
                  : "STRIPE_ALLOCATION_INVALID",
              "Stripe payment intent cannot be created",
              correlationId,
            );
    if (body.status === 404) return new NotFoundException(body);
    if (body.status === 403) return new ForbiddenException(body);
    return new ConflictException(body);
  }
  private hash(value: string) {
    return Uint8Array.from(createHash("sha256").update(value).digest());
  }
  private hashBytes(value: Buffer) {
    return Uint8Array.from(createHash("sha256").update(value).digest());
  }
  private problem(status: number, code: string, title: string, correlationId: string) {
    return { type: "/problems/stripe", title, status, code, correlationId };
  }
}
