import { expectApiError } from '../../test/expect-api-error';
import type { PayloadClient } from '../payload/payload-client';
import { ProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

function product(overrides: Partial<ProductDto> = {}): ProductDto {
  return {
    id: 7,
    name: 'Camera',
    status: 'published',
    price: 2_000_000,
    salePrice: null,
    isOnSale: false,
    stock: 5,
    ...overrides,
  };
}

describe('ProductsService pricing and stock rules', () => {
  // These rules do not call Payload.
  const service = new ProductsService({} as PayloadClient);

  describe('getCurrentPrice', () => {
    it('uses the regular price when the product is not on sale', () => {
      expect(service.getCurrentPrice(product({ salePrice: 1_500_000 }))).toBe(
        2_000_000,
      );
    });

    it('uses the sale price when the product is on sale', () => {
      expect(
        service.getCurrentPrice(
          product({ isOnSale: true, salePrice: 1_500_000 }),
        ),
      ).toBe(1_500_000);
    });

    it.each([null, 0, -100])(
      'falls back to the regular price when the sale price is %p',
      (salePrice) => {
        expect(
          service.getCurrentPrice(product({ isOnSale: true, salePrice })),
        ).toBe(2_000_000);
      },
    );

    it.each([0, -1, 10.5, Number.NaN])(
      'rejects an invalid price of %p',
      (price) => {
        expectApiError(
          () => service.getCurrentPrice(product({ price })),
          502,
          'PRODUCT_DATA_INVALID',
        );
      },
    );
  });

  describe('getAvailableStock', () => {
    it('returns the stock of a published product', () => {
      expect(service.getAvailableStock(product({ stock: 3 }))).toBe(3);
      expect(service.getAvailableStock(product({ stock: 0 }))).toBe(0);
    });

    it.each(['draft', null, undefined] as const)(
      'hides products with status %p',
      (status) => {
        expectApiError(
          () => service.getAvailableStock(product({ status })),
          404,
          'PRODUCT_NOT_FOUND',
        );
      },
    );

    it.each([null, undefined, -1, 2.5])(
      'rejects an invalid stock of %p',
      (stock) => {
        expectApiError(
          () => service.getAvailableStock(product({ stock })),
          502,
          'PRODUCT_DATA_INVALID',
        );
      },
    );
  });
});
