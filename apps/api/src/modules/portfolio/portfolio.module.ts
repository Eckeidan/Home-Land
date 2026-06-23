import { Module } from "@nestjs/common";
import { CreateBuildingService } from "./application/create-building.service.js";
import { CreatePortfolioFoundationService } from "./application/create-portfolio-foundation.service.js";
import { CreateUnitService } from "./application/create-unit.service.js";
import { GetPortfolioService } from "./application/get-portfolio.service.js";
import { GetPropertyWorkspaceService } from "./application/get-property-workspace.service.js";
import { ImportUnitsService } from "./application/import-units.service.js";
import { PortfolioRepository } from "./infrastructure/portfolio.repository.js";
import {
  PortfolioController,
  PortfolioPropertyController,
} from "./presentation/portfolio.controller.js";

@Module({
  controllers: [PortfolioController, PortfolioPropertyController],
  providers: [
    CreatePortfolioFoundationService,
    CreateBuildingService,
    CreateUnitService,
    GetPortfolioService,
    GetPropertyWorkspaceService,
    ImportUnitsService,
    PortfolioRepository,
  ],
})
export class PortfolioModule {}
