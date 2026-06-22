import { describe, expect, it, vi } from "vitest";
import type { InvitationRepository } from "../infrastructure/invitation.repository.js";
import { AcceptInvitationService } from "./accept-invitation.service.js";

const command = {
  userId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  email: "manager@example.com",
  token: "secure-invitation-token-value",
  correlationId: "acceptance-correlation",
};

describe("AcceptInvitationService", () => {
  it("returns only the membership context after atomic acceptance", async () => {
    const repository = {
      accept: vi.fn().mockResolvedValue({
        kind: "accepted",
        organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
        organizationName: "Home Land",
        role: "PROPERTY_MANAGER",
      }),
    };
    const service = new AcceptInvitationService(repository as unknown as InvitationRepository);
    await expect(service.execute(command)).resolves.toMatchObject({
      status: "ACCEPTED",
      role: "PROPERTY_MANAGER",
    });
  });

  it("uses one generic error for expired, revoked, mismatched, and consumed tokens", async () => {
    const repository = { accept: vi.fn().mockResolvedValue({ kind: "invalid" }) };
    const service = new AcceptInvitationService(repository as unknown as InvitationRepository);
    await expect(service.execute(command)).rejects.toMatchObject({
      response: { code: "INVITATION_INVALID" },
    });
  });
});
