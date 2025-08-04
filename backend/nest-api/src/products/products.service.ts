// nest-api/src/products/products.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly payloadApiUrl = 'http://localhost:3000/api';

  async findOne(id: string | number): Promise<ProductDto> {
    const response = await fetch(
      `${this.payloadApiUrl}/products/${id}?depth=0`,
    );
    if (!response.ok) {
      throw new NotFoundException(`محصول با شناسه ${id} یافت نشد.`);
    }
    return response.json();
  }

  getCurrentPrice(product: ProductDto): number {
    if (product.isOnSale && typeof product.salePrice === 'number') {
      return product.salePrice;
    }
    return product.price;
  }
}
