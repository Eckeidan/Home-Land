import { Module } from "@nestjs/common";
import { AcceptInvitationService } from "./application/accept-invitation.service.js";
import { ConfigureWorkspaceService } from "./application/configure-workspace.service.js";
import { CreateInvitationService } from "./application/create-invitation.service.js";
import { CreateOrganizationService } from "./application/create-organization.service.js";
import { InvitationRepository } from "./infrastructure/invitation.repository.js";
import { InvitationMailerService } from "./infrastructure/invitation-mailer.service.js";
import { OrganizationRepository } from "./infrastructure/organization.repository.js";
import { InvitationAcceptanceController } from "./presentation/invitation-acceptance.controller.js";
import { OrganizationController } from "./presentation/organization.controller.js";

@Module({
  controllers: [InvitationAcceptanceController, OrganizationController],
  providers: [
    AcceptInvitationService,
    ConfigureWorkspaceService,
    CreateInvitationService,
    CreateOrganizationService,
    InvitationMailerService,
    InvitationRepository,
    OrganizationRepository,
  ],
})
export class OrganizationModule {}
