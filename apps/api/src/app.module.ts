import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";
import { DatabaseModule } from "./infrastructure/database/database.module.js";
import { IdentityModule } from "./modules/identity/identity.module.js";

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    IdentityModule,
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
