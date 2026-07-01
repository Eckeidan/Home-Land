import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class ContactMessageDto {
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
  @MinLength(3)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(3000)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  message!: string;
}
