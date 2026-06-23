import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
export class CreateRentObligationDto {
  @IsString() @Matches(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) leaseId!: string;
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) period!: string;
}
class PaymentAllocationDto {
  @Matches(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) rentObligationId!: string;
  @IsInt() @Min(1) @Max(2_000_000_000) amountMinor!: number;
}
export class RecordPaymentDto {
  @IsIn(["ACH", "CHECK", "CASH", "OTHER"]) method!: "ACH" | "CHECK" | "CASH" | "OTHER";
  @IsISO8601({ strict: true }) receivedAt!: string;
  @IsOptional() @IsString() @MaxLength(120) externalReference?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}
class RefundAllocationDto {
  @Matches(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) paymentAllocationId!: string;
  @IsInt() @Min(1) @Max(2_000_000_000) amountMinor!: number;
}
export class RecordRefundDto {
  @Matches(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i) paymentId!: string;
  @IsString() @Min(3) @MaxLength(240) reason!: string;
  @IsISO8601({ strict: true }) refundedAt!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RefundAllocationDto)
  allocations!: RefundAllocationDto[];
}
export class CreateStripePaymentIntentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}
