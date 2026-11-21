// backend/nest-api/src/cart/dto/update-cart-item.dto.ts

import { IsInt, Max, Min } from 'class-validator';

// Bounded to the Postgres integer range, like AddToCartDto. Use DELETE to
// remove a line instead of setting it to zero.
const MAX_INT32 = 2_147_483_647;

export class UpdateCartItemDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT32)
  quantity!: number;
}
