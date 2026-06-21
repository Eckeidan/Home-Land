import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  fullName!: string;

  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  acceptedTermsVersion!: string;
}

export class VerifyEmailDto {
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  token!: string;
}
