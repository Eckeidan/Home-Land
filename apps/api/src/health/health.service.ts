import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  service: "api";
  status: "ok";
  timestamp: string;
  version: string;
}

@Injectable()
export class HealthService {
  getStatus(): HealthStatus {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  }
}
