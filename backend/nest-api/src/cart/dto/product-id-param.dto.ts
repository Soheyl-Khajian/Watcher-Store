// backend/nest-api/src/cart/dto/product-id-param.dto.ts

import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ProductIdParamDto {
  @Type(() => Number) // transformation
  @IsInt()
  @Min(1)
  productId!: number;
}
