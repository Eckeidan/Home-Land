import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
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

export class CreateUnitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  unitCode!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bedrooms?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  buildingId?: string;
}

export class CreateBuildingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class ImportUnitsDto {
  @IsIn(["DRY_RUN", "COMMIT"])
  mode!: "DRY_RUN" | "COMMIT";

  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  csv!: string;
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
