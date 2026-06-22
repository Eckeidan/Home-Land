import { describe, expect, it, vi } from "vitest";
import type { InvitationRepository } from "../infrastructure/invitation.repository.js";
import type { InvitationMailerService } from "../infrastructure/invitation-mailer.service.js";
import { CreateInvitationService } from "./create-invitation.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  email: " MANAGER@EXAMPLE.COM ",
  role: "PROPERTY_MANAGER" as const,
  idempotencyKey: "invitation-request-0001",
  correlationId: "invitation-correlation",
};

const response = {
  id: "d16662b8-426c-4e48-8e55-2e8dfc055ea8",
  email: "manager@example.com",
  role: "PROPERTY_MANAGER" as const,
  status: "PENDING" as const,
  expiresAt: new Date("2026-06-24T00:00:00Z"),
};

function setup(result: object) {
  const repository = { create: vi.fn().mockResolvedValue(result) };
  const mailer = { send: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new CreateInvitationService(
      repository as unknown as InvitationRepository,
      mailer as unknown as InvitationMailerService,
    ),
    repository,
    mailer,
  };
}

describe("CreateInvitationService", () => {
  it("normalizes email and delivers a newly committed invitation once", async () => {
    const { service, repository, mailer } = setup({
      kind: "created",
      response,
      organizationName: "Home Land",
    });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "manager@example.com", role: "PROPERTY_MANAGER" }),
    );
    await vi.waitFor(() => expect(mailer.send).toHaveBeenCalledOnce());
  });

  it("returns an idempotent replay without delivering another email", async () => {
    const { service, mailer } = setup({ kind: "replayed", response });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it("rejects OWNER even when transport validation is bypassed", async () => {
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.execute({ ...command, role: "OWNER" as never })).rejects.toMatchObject({
      response: { code: "INVITATION_ROLE_INVALID" },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "ORGANIZATION_NOT_FOUND"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["already_member", "INVITATION_MEMBER_EXISTS"],
    ["duplicate_race", "INVITATION_CONCURRENT_REQUEST"],
    ["state_invalid", "ONBOARDING_TRANSITION_INVALID"],
  ])("maps %s to stable error %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });
});
