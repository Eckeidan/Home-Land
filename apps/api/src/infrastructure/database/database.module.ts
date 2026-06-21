import { createPrismaClient, type DatabaseClient } from "@home-land/database";
import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from "@nestjs/common";
import { DATABASE_CLIENT } from "./database.constants.js";

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.database.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT,
      useFactory: () => createPrismaClient(),
    },
    DatabaseLifecycle,
  ],
  exports: [DATABASE_CLIENT],
})
export class DatabaseModule {}
