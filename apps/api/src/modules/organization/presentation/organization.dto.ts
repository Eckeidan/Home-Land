import { Transform } from "class-transformer";
import { IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";
import {
  type ApproximateUnitRange,
  approximateUnitRanges,
  type OrganizationType,
  organizationTypes,
} from "../domain/organization.types.js";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  legalName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  displayName!: string;

  @IsIn(organizationTypes)
  organizationType!: OrganizationType;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
  primaryStateCode!: string;

  @IsIn(approximateUnitRanges)
  approximateUnitRange!: ApproximateUnitRange;
}
