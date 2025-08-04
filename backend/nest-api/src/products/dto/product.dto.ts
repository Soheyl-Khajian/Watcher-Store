// nest-api/src/products/dto/product.dto.ts
export class ProductDto {
  id: string | number;
  name: string;
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean;
}
