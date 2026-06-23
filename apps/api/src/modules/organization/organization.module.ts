import { Module } from "@nestjs/common";
import { AcceptInvitationService } from "./application/accept-invitation.service.js";
import { ActivateWorkspaceService } from "./application/activate-workspace.service.js";
import { ConfigureWorkspaceService } from "./application/configure-workspace.service.js";
import { CreateInvitationService } from "./application/create-invitation.service.js";
import { CreateOrganizationService } from "./application/create-organization.service.js";
import { GetOnboardingReadinessService } from "./application/get-onboarding-readiness.service.js";
import { InvitationRepository } from "./infrastructure/invitation.repository.js";
import { InvitationMailerService } from "./infrastructure/invitation-mailer.service.js";
import { OnboardingRepository } from "./infrastructure/onboarding.repository.js";
import { OrganizationRepository } from "./infrastructure/organization.repository.js";
import { InvitationAcceptanceController } from "./presentation/invitation-acceptance.controller.js";
import { OnboardingController } from "./presentation/onboarding.controller.js";
import { OrganizationController } from "./presentation/organization.controller.js";

@Module({
  controllers: [InvitationAcceptanceController, OrganizationController, OnboardingController],
  providers: [
    ActivateWorkspaceService,
    AcceptInvitationService,
    ConfigureWorkspaceService,
    CreateInvitationService,
    CreateOrganizationService,
    GetOnboardingReadinessService,
    InvitationMailerService,
    InvitationRepository,
    OnboardingRepository,
    OrganizationRepository,
  ],
})
export class OrganizationModule {}
