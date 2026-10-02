// backend/nest-api/src/products/dto/product.dto.ts

export class ProductDto {
  id!: string | number;
  name!: string;
  status?: 'published' | 'draft' | null;
  price!: number;
  salePrice?: number | null;
  isOnSale?: boolean | null;
  stock?: number | null;
}
