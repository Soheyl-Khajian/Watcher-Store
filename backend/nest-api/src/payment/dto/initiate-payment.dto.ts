// backend/nest-api/src/payment/dto/initiate-payment.dto.ts

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class InitiatePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // The largest id Postgres's integer column holds; beyond it the database
  // would fail the query instead of the request being refused.
  @Max(2_147_483_647)
  orderId!: number;
}
