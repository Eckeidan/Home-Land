import "reflect-metadata";
import "./config/environment.js";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const port = Number.parseInt(process.env.API_PORT ?? process.env.PORT ?? "4000", 10);
  const allowedOrigins = new Set(
    [
      process.env.WEB_ORIGIN,
      process.env.APP_PUBLIC_URL,
      "http://localhost:3000",
      "https://asset-hub-web.onrender.com",
    ]
      .flatMap((origin) => origin?.split(",") ?? [])
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS"));
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
