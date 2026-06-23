import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateTenantDto {
  @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === "string" ? value.toLowerCase() : value))
  email!: string;
  @IsOptional() @Matches(/^\+?[0-9 ()-]{7,32}$/) phone?: string;
  @IsBoolean() sendInvitation!: boolean;
}

export class CreateLeaseDraftDto {
  @Matches(/^[0-9a-f-]{36}$/i) propertyId!: string;
  @Matches(/^[0-9a-f-]{36}$/i) unitId!: string;
  @Matches(/^[0-9a-f-]{36}$/i) tenantProfileId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) endDate!: string;
  @IsInt() @Min(1) @Max(2_000_000_000) monthlyRentMinor!: number;
  @IsInt() @Min(0) @Max(2_000_000_000) securityDepositMinor!: number;
  @IsInt() @Min(1) @Max(28) rentDueDay!: number;
}

export class AcceptTenantInvitationDto {
  @IsString() @MinLength(32) @MaxLength(512) token!: string;
}
