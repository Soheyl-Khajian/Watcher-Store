// backend/nest-api/src/orders/dto/orders-query.dto.ts

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const ORDERS_DEFAULT_LIMIT = 10;
export const ORDERS_MAX_LIMIT = 50;
export const ORDERS_MAX_PAGE = 100_000;

// Paging for a customer's own order history.
export class OrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORDERS_MAX_PAGE)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORDERS_MAX_LIMIT)
  limit = ORDERS_DEFAULT_LIMIT;
}
