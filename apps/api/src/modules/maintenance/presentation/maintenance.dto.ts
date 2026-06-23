import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export class CreateMaintenanceRequestDto {
  @Matches(uuidPattern) propertyId!: string;
  @IsOptional() @Matches(uuidPattern) unitId?: string;
  @IsOptional() @Matches(uuidPattern) tenantProfileId?: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(10) @MaxLength(2000) description!: string;
  @IsIn(["LOW", "NORMAL", "HIGH", "EMERGENCY"]) priority!: "LOW" | "NORMAL" | "HIGH" | "EMERGENCY";
}

export class MaintenanceTransitionDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) assignedVendorName?: string;
  @IsOptional() @IsEmail() @MaxLength(320) assignedVendorEmail?: string;
  @IsOptional() @IsISO8601({ strict: true }) scheduledFor?: string;
}
