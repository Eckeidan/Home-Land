import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { ImportUnitRow, UnitImportReport } from "../domain/portfolio.types.js";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

interface ImportCsvCommand {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
  mode: "DRY_RUN" | "COMMIT";
  csv: string;
  idempotencyKey?: string;
  correlationId: string;
}

@Injectable()
export class ImportUnitsService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(command: ImportCsvCommand): Promise<UnitImportReport> {
    const rows = this.parse(command);
    const normalized = JSON.stringify(rows);
    const result = await this.repository.importUnits({
      organizationId: command.organizationId,
      propertyId: command.propertyId,
      actorUserId: command.actorUserId,
      mode: command.mode,
      rows,
      ...(command.idempotencyKey ? { keyHash: this.hash(command.idempotencyKey) } : {}),
      requestHash: this.hash(normalized),
      correlationId: command.correlationId,
    });
    switch (result.kind) {
      case "validated":
      case "committed":
      case "replayed":
        return result.report;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "PROPERTY_NOT_FOUND", "Property was not found"),
        );
      case "forbidden":
        throw new ForbiddenException(
          this.problem(command, 403, "UNIT_IMPORT_FORBIDDEN", "Unit import is not permitted"),
        );
      case "workspace_inactive":
        throw new ConflictException(
          this.problem(command, 409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"),
        );
      case "idempotency_conflict":
        throw new ConflictException(
          this.problem(command, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"),
        );
      case "concurrent_request":
        throw new ConflictException(
          this.problem(command, 409, "UNIT_IMPORT_CONCURRENT", "Another import is being processed"),
        );
    }
  }

  private parse(command: ImportCsvCommand): ImportUnitRow[] {
    const lines = command.csv
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim());
    if (lines.length < 2 || lines.length > 501) {
      throw new UnprocessableEntityException(
        this.problem(command, 422, "CSV_ROW_COUNT_INVALID", "CSV must contain 1 to 500 data rows"),
      );
    }
    const header = this.line(lines[0] ?? "").map((cell) => cell.trim().toLowerCase());
    const required = ["unit_code", "building_name", "bedrooms", "bathrooms"];
    if (
      header.length !== required.length ||
      !required.every((name, index) => header[index] === name)
    ) {
      throw new UnprocessableEntityException(
        this.problem(
          command,
          422,
          "CSV_HEADER_INVALID",
          `CSV header must be ${required.join(",")}`,
        ),
      );
    }
    const seen = new Set<string>();
    return lines.slice(1).map((line, index) => {
      const cells = this.line(line);
      if (cells.length !== 4)
        throw new UnprocessableEntityException(
          this.problem(
            command,
            422,
            "CSV_COLUMN_COUNT_INVALID",
            `CSV row ${index + 2} has an invalid column count`,
          ),
        );
      const unitCode = (cells[0] ?? "").trim().replace(/\s+/g, " ");
      const buildingName = (cells[1] ?? "").trim().replace(/\s+/g, " ");
      if (!unitCode || unitCode.length > 80 || this.formula(unitCode)) {
        throw new UnprocessableEntityException(
          this.problem(
            command,
            422,
            "CSV_UNIT_CODE_INVALID",
            `CSV row ${index + 2} has an invalid unit code`,
          ),
        );
      }
      if (buildingName.length > 120 || this.formula(buildingName)) {
        throw new UnprocessableEntityException(
          this.problem(
            command,
            422,
            "CSV_BUILDING_NAME_INVALID",
            `CSV row ${index + 2} has an invalid building name`,
          ),
        );
      }
      const duplicateKey = unitCode.toLowerCase();
      if (seen.has(duplicateKey))
        throw new UnprocessableEntityException(
          this.problem(
            command,
            422,
            "CSV_DUPLICATE_UNIT_CODE",
            `CSV row ${index + 2} duplicates a unit code`,
          ),
        );
      seen.add(duplicateKey);
      const bedrooms = this.number(cells[2] ?? "", true, index + 2, command);
      const bathrooms = this.number(cells[3] ?? "", false, index + 2, command);
      return {
        rowNumber: index + 2,
        unitCode,
        ...(buildingName ? { buildingName } : {}),
        ...(bedrooms !== undefined ? { bedrooms } : {}),
        ...(bathrooms !== undefined ? { bathrooms } : {}),
      };
    });
  }

  private line(value: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === '"' && quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = !quoted;
      else if (character === "," && !quoted) {
        cells.push(cell);
        cell = "";
      } else cell += character;
    }
    if (quoted) return [];
    cells.push(cell);
    return cells;
  }

  private number(value: string, integer: boolean, row: number, command: ImportCsvCommand) {
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > 20 ||
      (integer ? !Number.isInteger(parsed) : parsed * 2 !== Math.trunc(parsed * 2))
    ) {
      throw new UnprocessableEntityException(
        this.problem(
          command,
          422,
          integer ? "CSV_BEDROOMS_INVALID" : "CSV_BATHROOMS_INVALID",
          `CSV row ${row} contains an invalid number`,
        ),
      );
    }
    return parsed;
  }

  private formula(value: string): boolean {
    return /^[=+\-@]/.test(value);
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(command: ImportCsvCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/portfolio-import",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
