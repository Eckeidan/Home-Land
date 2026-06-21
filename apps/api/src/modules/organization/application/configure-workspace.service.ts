import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  ConfigureWorkspaceCommand,
  WorkspaceConfigured,
} from "../domain/organization.types.js";
import { OrganizationRepository } from "../infrastructure/organization.repository.js";

const reservedSlugs = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "help",
  "login",
  "mail",
  "onboarding",
  "register",
  "root",
  "security",
  "support",
  "system",
  "www",
]);

@Injectable()
export class ConfigureWorkspaceService {
  constructor(
    @Inject(OrganizationRepository) private readonly repository: OrganizationRepository,
  ) {}

  async execute(command: ConfigureWorkspaceCommand): Promise<WorkspaceConfigured> {
    const slug = command.slug.trim().toLowerCase();
    if (reservedSlugs.has(slug)) {
      throw new ConflictException(
        this.problem(command, 409, "WORKSPACE_SLUG_RESERVED", "Workspace slug is reserved"),
      );
    }

    const timeZone = this.canonicalTimeZone(command.timeZone, command);
    const result = await this.repository.configureWorkspace({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      slug,
      timeZone,
      locale: command.locale,
      expectedVersion: command.expectedVersion,
      correlationId: command.correlationId,
    });

    switch (result.kind) {
      case "configured":
        return result.response;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
        );
      case "version_mismatch":
        throw new PreconditionFailedException({
          ...this.problem(command, 412, "VERSION_MISMATCH", "Organization version does not match"),
          currentVersion: result.currentVersion,
        });
      case "transition_invalid":
        throw new ConflictException({
          ...this.problem(
            command,
            409,
            "ONBOARDING_TRANSITION_INVALID",
            "Workspace cannot be configured from its current state",
          ),
          currentState: result.currentState,
        });
      case "slug_unavailable":
        throw new ConflictException(
          this.problem(command, 409, "WORKSPACE_SLUG_UNAVAILABLE", "Workspace slug is unavailable"),
        );
    }
  }

  private canonicalTimeZone(value: string, command: ConfigureWorkspaceCommand): string {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
    } catch {
      throw new UnprocessableEntityException(
        this.problem(
          command,
          422,
          "TIME_ZONE_INVALID",
          "Time zone must be a valid IANA identifier",
        ),
      );
    }
  }

  private problem(command: ConfigureWorkspaceCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/workspace-configuration",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
