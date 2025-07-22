// src/payment/dto/verify-payment.dto.ts
import { IsEnum, IsNotEmpty, IsNumberString } from 'class-validator';

export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class VerifyPaymentDto {
  @IsNumberString()
  @IsNotEmpty()
  orderId: string;

  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;
}
