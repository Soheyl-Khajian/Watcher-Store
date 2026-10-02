// backend/nest-api/src/products/products.service.ts

import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isTomanAmount } from '../common/money/toman';
import { env } from '../env';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly payloadApiUrl = env.PAYLOAD_INTERNAL_URL;

  async findOne(id: string | number): Promise<ProductDto> {
    const response = await fetch(
      `${this.payloadApiUrl}/products/${id}?depth=0`,
    );

    // Treat inaccessible drafts like nonexistent products so checkout does
    // not disclose unpublished product records.
    if (response.status === 403 || response.status === 404) {
      throw new NotFoundException(`محصول با شناسه ${id} یافت نشد.`);
    }

    if (!response.ok) {
      throw new BadGatewayException('امکان دریافت اطلاعات محصول وجود ندارد.');
    }

    return response.json();
  }

  getCurrentPrice(product: ProductDto): number {
    const currentPrice =
      product.isOnSale &&
      typeof product.salePrice === 'number' &&
      product.salePrice > 0
        ? product.salePrice
        : product.price;

    if (!isTomanAmount(currentPrice) || currentPrice === 0) {
      throw new BadGatewayException(
        `قیمت محصول با شناسه ${product.id} نامعتبر است.`,
      );
    }

    return currentPrice;
  }

  getAvailableStock(product: ProductDto): number {
    if (product.status !== 'published') {
      throw new NotFoundException(`محصول با شناسه ${product.id} یافت نشد.`);
    }

    if (
      typeof product.stock !== 'number' ||
      !Number.isSafeInteger(product.stock) ||
      product.stock < 0
    ) {
      throw new BadGatewayException(
        `موجودی محصول با شناسه ${product.id} نامعتبر است.`,
      );
    }

    return product.stock;
  }
}
