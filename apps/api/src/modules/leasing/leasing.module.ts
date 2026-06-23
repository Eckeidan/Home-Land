import { Module } from "@nestjs/common";
import { LeasingService } from "./application/leasing.service.js";
import { LeasingRepository } from "./infrastructure/leasing.repository.js";
import { TenantInvitationMailerService } from "./infrastructure/tenant-invitation-mailer.service.js";
import {
  LeasingController,
  TenantInvitationController,
} from "./presentation/leasing.controller.js";
@Module({
  controllers: [LeasingController, TenantInvitationController],
  providers: [LeasingService, LeasingRepository, TenantInvitationMailerService],
})
export class LeasingModule {}
