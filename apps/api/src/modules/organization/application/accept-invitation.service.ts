import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { AcceptInvitationCommand } from "../domain/organization.types.js";
import { InvitationRepository } from "../infrastructure/invitation.repository.js";

@Injectable()
export class AcceptInvitationService {
  constructor(@Inject(InvitationRepository) private readonly repository: InvitationRepository) {}

  async execute(command: AcceptInvitationCommand) {
    const result = await this.repository.accept(
      Uint8Array.from(createHash("sha256").update(command.token, "utf8").digest()),
      command.userId,
      command.email.toLowerCase(),
      command.correlationId,
    );
    if (result.kind === "invalid") {
      throw new BadRequestException(
        this.problem(command, 400, "INVITATION_INVALID", "Invitation is invalid or expired"),
      );
    }
    if (result.kind === "already_member") {
      throw new ConflictException(
        this.problem(command, 409, "INVITATION_MEMBER_EXISTS", "Membership already exists"),
      );
    }
    return {
      status: "ACCEPTED",
      organizationId: result.organizationId,
      organizationName: result.organizationName,
      role: result.role,
    } as const;
  }

  private problem(command: AcceptInvitationCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/organization-invitation",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
