import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MAX_PRICE } from '../src/collections/productValidation';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

describe('Product price and stock validation', () => {
  let t: TestPayload;
  let token: string;
  let counter = 0;

  beforeAll(async () => {
    t = await createTestPayload();
    token = (await t.createUser('catalog-editor@example.test', 'admin')).token;
  });

  afterAll(async () => {
    await t?.close();
  });

  const create = (data: Record<string, unknown>) => {
    counter += 1;
    return t.api('POST', '/products', {
      token,
      body: {
        name: `Product ${counter}`,
        sku: `SKU-${counter}`,
        slug: `product-${counter}`,
        status: 'published',
        price: 2_000_000,
        stock: 5,
        ...data,
      },
    });
  };

  const errorPaths = (body: Record<string, unknown>) =>
    (
      (body.errors as Array<{ data?: { errors?: Array<{ path: string }> } }>) ??
      []
    )
      .flatMap((error) => error.data?.errors ?? [])
      .map((error) => error.path);

  it('accepts a valid product, with and without a sale price', async () => {
    expect((await create({})).status).toBe(201);
    expect(
      (await create({ isOnSale: true, salePrice: 1_500_000 })).status,
    ).toBe(201);
  });

  describe('price', () => {
    it.each([0, -1, 1.5, MAX_PRICE + 1])('rejects %p', async (price) => {
      const response = await create({ price });
      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('price');
    });

    it('is required', async () => {
      const response = await create({ price: null });
      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('price');
    });

    it('accepts the largest amount checkout supports', async () => {
      expect((await create({ price: MAX_PRICE })).status).toBe(201);
    });
  });

  describe('sale price', () => {
    it.each([
      ['equal to the price', 2_000_000],
      ['above the price', 2_500_000],
      ['zero', 0],
      ['fractional', 1_000_000.5],
    ])('rejects a sale price %s', async (_label, salePrice) => {
      const response = await create({ isOnSale: true, salePrice });
      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('salePrice');
    });

    it('requires a sale price when the product is marked on sale', async () => {
      const response = await create({ isOnSale: true });
      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('salePrice');
    });

    // Validation must see the stored price on partial updates too.
    it('rejects a sale price above the stored price on update', async () => {
      const created = await create({ price: 1_000_000 });
      const id = (created.body.doc as { id: number }).id;

      const response = await t.api('PATCH', `/products/${id}`, {
        token,
        body: { isOnSale: true, salePrice: 1_200_000 },
      });

      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('salePrice');
    });
  });

  describe('stock', () => {
    it.each([-1, 2.5])('rejects %p', async (stock) => {
      const response = await create({ stock });
      expect(response.status).toBe(400);
      expect(errorPaths(response.body)).toContain('stock');
    });

    it('accepts zero (sold out)', async () => {
      expect((await create({ stock: 0 })).status).toBe(201);
    });
  });
});
