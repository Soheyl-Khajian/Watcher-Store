// backend/nest-api/src/cart/dto/add-to-cart.dto.ts

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

// Bounded to the Postgres integer range so absurd values are rejected with
// 400 instead of reaching the database.
const MAX_INT32 = 2_147_483_647;

export class AddToCartDto {
  @Type(() => Number) // transformation
  @IsInt()
  @Min(1)
  @Max(MAX_INT32)
  productId!: number;

  @Type(() => Number) // transformation
  @IsInt()
  @Min(1)
  @Max(MAX_INT32)
  quantity!: number;
}
