// backend/nest-api/src/products/products.service.ts

import type { EntityManager } from 'typeorm';
import { HttpStatus, Injectable } from '@nestjs/common';
import { isTomanAmount } from '../common/money/toman';
import { env } from '../env';
import { PayloadClient } from '../payload/payload-client';
import { ProductDto } from './dto/product.dto';
import { ApiError } from '../common/http/api-error';

@Injectable()
export class ProductsService {
  constructor(private readonly payload: PayloadClient) {}

  // Drafts and missing products are 404; Payload outages are 503.
  findOne(id: string | number): Promise<ProductDto> {
    return this.payload.findProduct(id);
  }

  getCurrentPrice(product: ProductDto): number {
    const currentPrice =
      product.isOnSale &&
      typeof product.salePrice === 'number' &&
      product.salePrice > 0
        ? product.salePrice
        : product.price;

    if (!isTomanAmount(currentPrice) || currentPrice === 0) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'PRODUCT_DATA_INVALID',
        'A product has an invalid price.',
      );
    }

    return currentPrice;
  }

  getAvailableStock(product: ProductDto): number {
    if (product.status !== 'published') {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'PRODUCT_NOT_FOUND',
        'The product was not found or is not published.',
      );
    }

    if (
      typeof product.stock !== 'number' ||
      !Number.isSafeInteger(product.stock) ||
      product.stock < 0
    ) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'PRODUCT_DATA_INVALID',
        'A product has an invalid stock count.',
      );
    }

    return product.stock;
  }

  async consumeStock(
    manager: EntityManager,
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const numericProductId = Number(productId);

    if (
      !Number.isSafeInteger(numericProductId) ||
      numericProductId < 1 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'PRODUCT_DATA_INVALID',
        'An ordered product has invalid data.',
      );
    }

    // PAYLOAD_SCHEMA is validated as a safe SQL identifier in env.ts.
    // Values remain parameterized.
    const [updatedProducts, affectedRows] = (await manager.query(
      `
        UPDATE "${env.PAYLOAD_SCHEMA}"."products"
        SET
          "stock" = "stock" - $2,
          "updated_at" = now()
        WHERE "id" = $1
          AND "status" = 'published'
          AND "stock" IS NOT NULL
          AND "stock" = trunc("stock")
          AND "stock" >= $2
        RETURNING "id"
      `,
      [numericProductId, quantity],
    )) as [Array<{ id: number }>, number];

    return affectedRows === 1 && updatedProducts.length === 1;
  }

  // Puts units back after a paid order is cancelled. Unlike consumeStock this
  // does not require the product to be published, because a product that was
  // unpublished after the sale must still get its stock back.
  async restoreStock(
    manager: EntityManager,
    productId: string,
    quantity: number,
  ): Promise<boolean> {
    const numericProductId = Number(productId);

    if (
      !Number.isSafeInteger(numericProductId) ||
      numericProductId < 1 ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'PRODUCT_DATA_INVALID',
        'An ordered product has invalid data.',
      );
    }

    // PAYLOAD_SCHEMA is validated as a safe SQL identifier in env.ts.
    // Values remain parameterized.
    const [updatedProducts, affectedRows] = (await manager.query(
      `
        UPDATE "${env.PAYLOAD_SCHEMA}"."products"
        SET
          "stock" = COALESCE("stock", 0) + $2,
          "updated_at" = now()
        WHERE "id" = $1
        RETURNING "id"
      `,
      [numericProductId, quantity],
    )) as [Array<{ id: number }>, number];

    return affectedRows === 1 && updatedProducts.length === 1;
  }
}
