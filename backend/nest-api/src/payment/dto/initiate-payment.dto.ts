// src/payment/dto/initiate-payment.dto.ts
import { IsNotEmpty, IsNumber } from 'class-validator';

export class InitiatePaymentDto {
  @IsNumber()
  @IsNotEmpty()
  orderId: number;
}
