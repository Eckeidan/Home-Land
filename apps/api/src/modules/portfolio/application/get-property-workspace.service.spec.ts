import { describe, expect, it, vi } from "vitest";
import type { PortfolioRepository } from "../infrastructure/portfolio.repository.js";
import { GetPropertyWorkspaceService } from "./get-property-workspace.service.js";

describe("GetPropertyWorkspaceService", () => {
  it("returns the organization-scoped workspace", async () => {
    const workspace = { property: { id: "property" }, units: [] };
    const repository = { getPropertyWorkspace: vi.fn().mockResolvedValue(workspace) };
    const service = new GetPropertyWorkspaceService(repository as unknown as PortfolioRepository);
    await expect(service.execute("organization", "property", "user")).resolves.toEqual(workspace);
  });

  it("uses a non-enumerating not-found response", async () => {
    const repository = { getPropertyWorkspace: vi.fn().mockResolvedValue(null) };
    const service = new GetPropertyWorkspaceService(repository as unknown as PortfolioRepository);
    await expect(service.execute("other-organization", "property", "user")).rejects.toMatchObject({
      response: { code: "PROPERTY_NOT_FOUND" },
    });
  });
});
