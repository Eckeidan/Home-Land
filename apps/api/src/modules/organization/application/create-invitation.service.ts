import { createHash, randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type CreateInvitationCommand,
  type InvitationSummary,
  invitationalRoles,
} from "../domain/organization.types.js";
import { InvitationRepository } from "../infrastructure/invitation.repository.js";
import { InvitationMailerService } from "../infrastructure/invitation-mailer.service.js";

@Injectable()
export class CreateInvitationService {
  constructor(
    @Inject(InvitationRepository) private readonly repository: InvitationRepository,
    @Inject(InvitationMailerService) private readonly mailer: InvitationMailerService,
  ) {}

  async execute(command: CreateInvitationCommand): Promise<InvitationSummary> {
    if (!(invitationalRoles as readonly string[]).includes(command.role)) {
      throw new BadRequestException(
        this.problem(command, 400, "INVITATION_ROLE_INVALID", "Invitation role is not allowed"),
      );
    }
    const email = command.email.trim().toLowerCase();
    const token = randomBytes(32).toString("base64url");
    const normalizedRequest = { email, role: command.role };
    const result = await this.repository.create({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      email,
      role: command.role,
      tokenHash: this.hash(token),
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalizedRequest)),
      expiresAt: new Date(Date.now() + 72 * 60 * 60_000),
      correlationId: command.correlationId,
    });

    switch (result.kind) {
      case "created":
        void this.mailer
          .send({ email, token, organizationName: result.organizationName, role: command.role })
          .catch(() => undefined);
        return result.response;
      case "replayed":
        return result.response;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
        );
      case "idempotency_conflict":
        throw new ConflictException(
          this.problem(command, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"),
        );
      case "already_member":
        throw new ConflictException(
          this.problem(command, 409, "INVITATION_MEMBER_EXISTS", "This person is already a member"),
        );
      case "duplicate_race":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "INVITATION_CONCURRENT_REQUEST",
            "Another invitation request is already being processed",
          ),
        );
      case "state_invalid":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "ONBOARDING_TRANSITION_INVALID",
            "Invitations are unavailable in the current state",
          ),
        );
    }
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(command: CreateInvitationCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/organization-invitation",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
