import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { type PropertyType, propertyTypes } from "../domain/portfolio.types.js";

export class UsAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @Matches(/^[A-Z]{2}$/)
  @Transform(({ value }) => (typeof value === "string" ? value.toUpperCase() : value))
  stateCode!: string;

  @Matches(/^\d{5}(?:-\d{4})?$/)
  postalCode!: string;

  @IsIn(["US"])
  countryCode!: "US";
}

export class CreatePortfolioFoundationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  propertyName!: string;

  @IsIn(propertyTypes)
  propertyType!: PropertyType;

  @ValidateNested()
  @Type(() => UsAddressDto)
  address!: UsAddressDto;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timeZone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  unitCode!: string;
}
