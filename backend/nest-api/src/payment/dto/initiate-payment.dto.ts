// backend/nest-api/src/payment/dto/initiate-payment.dto.ts

import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class InitiatePaymentDto {
  @Type(() => Number) // transformation
  @IsInt()
  @Min(1)
  orderId!: number;
}
