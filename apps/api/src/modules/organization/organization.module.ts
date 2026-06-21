import { Module } from "@nestjs/common";
import { ConfigureWorkspaceService } from "./application/configure-workspace.service.js";
import { CreateOrganizationService } from "./application/create-organization.service.js";
import { OrganizationRepository } from "./infrastructure/organization.repository.js";
import { OrganizationController } from "./presentation/organization.controller.js";

@Module({
  controllers: [OrganizationController],
  providers: [ConfigureWorkspaceService, CreateOrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
