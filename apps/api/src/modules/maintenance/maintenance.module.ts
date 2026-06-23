import { Module } from "@nestjs/common";
import { MaintenanceService } from "./application/maintenance.service.js";
import { MaintenanceRepository } from "./infrastructure/maintenance.repository.js";
import { MaintenanceController } from "./presentation/maintenance.controller.js";

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRepository],
})
export class MaintenanceModule {}
