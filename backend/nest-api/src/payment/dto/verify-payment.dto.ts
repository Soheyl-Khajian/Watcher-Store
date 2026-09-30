// backend/nest-api/src/payment/dto/verify-payment.dto.ts

import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class VerifyPaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;
}
