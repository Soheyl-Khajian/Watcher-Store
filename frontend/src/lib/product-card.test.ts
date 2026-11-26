import { describe, expect, it } from 'vitest';
import type { Product } from '@/types';
import { toCardProduct } from './product-card';

const product = {
  id: 7,
  name: 'Dome camera',
  sku: 'CAM-7',
  slug: 'dome-camera',
  price: 1_200_000,
  salePrice: 990_000,
  isOnSale: true,
  stock: 3,
  gallery: [{ image: { id: 1, url: '/api/media/file/cam.png' } }],
  specifications: [{ specName: 'Lens', specValue: '2.8mm' }],
  features: [{ feature: 'Night vision' }],
  description: { root: { children: [] } },
} as unknown as Product;

describe('toCardProduct', () => {
  it('keeps only what the card shows', () => {
    expect(toCardProduct(product)).toEqual({
      id: 7,
      name: 'Dome camera',
      slug: 'dome-camera',
      price: 1_200_000,
      salePrice: 990_000,
      stock: 3,
      imageUrl: '/uploads/cam.png',
    });
  });

  it('has no sale price when the product is not on sale', () => {
    expect(toCardProduct({ ...product, isOnSale: false }).salePrice).toBeNull();
    expect(toCardProduct({ ...product, salePrice: 0 }).salePrice).toBeNull();
  });

  it('has no image, slug or stock when the product has none', () => {
    const card = toCardProduct({
      ...product,
      slug: undefined,
      stock: undefined,
      gallery: null,
    });
    expect(card).toMatchObject({ slug: '', stock: 0, imageUrl: '' });
  });
});
