// backend/nest-api/src/orders/dto/order-id-param.dto.ts

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class OrderIdParamDto {
  // Bounded to the Postgres integer range so absurd ids are rejected with 400
  // instead of reaching the database.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  id!: number;
}
