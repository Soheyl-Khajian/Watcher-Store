import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { getCurrentPrice } from './pricing';

const product = (overrides: Partial<Product>): Product =>
  ({
    price: 2_000_000,
    salePrice: null,
    isOnSale: false,
    ...overrides,
  }) as Product;

describe('getCurrentPrice', () => {
  it('returns the regular price when the product is not on sale', () => {
    expect(getCurrentPrice(product({ salePrice: 1_500_000 }))).toBe(2_000_000);
  });

  it('returns the sale price when the product is on sale', () => {
    expect(
      getCurrentPrice(product({ isOnSale: true, salePrice: 1_500_000 })),
    ).toBe(1_500_000);
  });

  it.each([null, undefined, 0, -10])(
    'ignores an on-sale flag without a usable sale price (%p)',
    (salePrice) => {
      expect(
        getCurrentPrice(
          product({ isOnSale: true, salePrice: salePrice as number | null }),
        ),
      ).toBe(2_000_000);
    },
  );
});
