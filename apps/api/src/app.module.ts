import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { SessionModule } from "./infrastructure/session/session.module.js";
import { ContactModule } from "./modules/contact/contact.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";
import { LeasingModule } from "./modules/leasing/leasing.module.js";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module.js";
import { OrganizationModule } from "./modules/organization/organization.module.js";
import { PortfolioModule } from "./modules/portfolio/portfolio.module.js";
import { RentModule } from "./modules/rent/rent.module.js";

@Module({
  imports: [
    DatabaseModule,
    SessionModule,
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    ContactModule,
    IdentityModule,
    OrganizationModule,
    PortfolioModule,
    LeasingModule,
    RentModule,
    MaintenanceModule,
  ],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
