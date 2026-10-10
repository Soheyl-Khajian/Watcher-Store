// backend/nest-api/src/orders/dto/admin-orders-query.dto.ts

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const ADMIN_ORDERS_DEFAULT_LIMIT = 25;
export const ADMIN_ORDERS_MAX_LIMIT = 100;
export const ADMIN_ORDERS_MAX_PAGE = 100_000;

export class AdminOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_ORDERS_MAX_PAGE)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ADMIN_ORDERS_MAX_LIMIT)
  limit = ADMIN_ORDERS_DEFAULT_LIMIT;
}
