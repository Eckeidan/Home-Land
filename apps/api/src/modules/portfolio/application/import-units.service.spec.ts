import { describe, expect, it, vi } from "vitest";
import type { PortfolioRepository } from "../infrastructure/portfolio.repository.js";
import { ImportUnitsService } from "./import-units.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  propertyId: "8175268e-5cbb-46d0-93a5-f26f883d01f9",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  mode: "DRY_RUN" as const,
  csv: 'unit_code,building_name,bedrooms,bathrooms\n101,North Tower,2,1.5\n"A,2",,1,1',
  correlationId: "import-correlation",
};

function setup(result: object) {
  const repository = { importUnits: vi.fn().mockResolvedValue(result) };
  return {
    service: new ImportUnitsService(repository as unknown as PortfolioRepository),
    repository,
  };
}

describe("ImportUnitsService", () => {
  it("parses quoted CSV and submits normalized rows", async () => {
    const report = {
      mode: "DRY_RUN",
      totalRows: 2,
      validRows: 2,
      errorRows: 0,
      createdCount: 0,
      errors: [],
    };
    const { service, repository } = setup({ kind: "validated", report });
    await expect(service.execute(command)).resolves.toEqual(report);
    expect(repository.importUnits).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: [
          expect.objectContaining({
            rowNumber: 2,
            unitCode: "101",
            buildingName: "North Tower",
            bedrooms: 2,
            bathrooms: 1.5,
          }),
          expect.objectContaining({ rowNumber: 3, unitCode: "A,2", bedrooms: 1, bathrooms: 1 }),
        ],
      }),
    );
  });

  it.each([
    ["bad,header\n101,x", "CSV_HEADER_INVALID"],
    ["unit_code,building_name,bedrooms,bathrooms\n=CMD,,1,1", "CSV_UNIT_CODE_INVALID"],
    ["unit_code,building_name,bedrooms,bathrooms\n101,,1,1\n101,,1,1", "CSV_DUPLICATE_UNIT_CODE"],
    ["unit_code,building_name,bedrooms,bathrooms\n101,,1.2,1", "CSV_BEDROOMS_INVALID"],
  ])("rejects unsafe CSV with %s", async (csv, code) => {
    const { service, repository } = setup({ kind: "validated" });
    await expect(service.execute({ ...command, csv })).rejects.toMatchObject({
      response: { code },
    });
    expect(repository.importUnits).not.toHaveBeenCalled();
  });

  it("hashes the idempotency key only for commit", async () => {
    const report = {
      mode: "COMMIT",
      totalRows: 2,
      validRows: 2,
      errorRows: 0,
      createdCount: 2,
      errors: [],
    };
    const { service, repository } = setup({ kind: "committed", report });
    await service.execute({
      ...command,
      mode: "COMMIT",
      idempotencyKey: "unit-import-commit-0001",
    });
    expect(repository.importUnits).toHaveBeenCalledWith(
      expect.objectContaining({ keyHash: expect.any(Uint8Array) }),
    );
  });
});
