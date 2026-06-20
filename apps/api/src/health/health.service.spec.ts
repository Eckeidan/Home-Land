import { describe, expect, it } from "vitest";
import { HealthService } from "./health.service.js";

describe("HealthService", () => {
  it("returns the API health contract", () => {
    const result = new HealthService().getStatus();

    expect(result.service).toBe("api");
    expect(result.status).toBe("ok");
    expect(result.version).toBe("0.1.0");
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
