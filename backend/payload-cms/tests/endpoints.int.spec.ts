import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

describe('Custom endpoints', () => {
  let t: TestPayload;
  let admin: { id: number; token: string };
  let customer: { id: number; token: string };
  let parentId: number;
  let childId: number;

  async function createProduct(
    slug: string,
    price: number,
    categories: number[],
    status: 'published' | 'draft' = 'published',
  ): Promise<number> {
    const product = await t.payload.create({
      collection: 'products',
      data: { name: slug, sku: slug, slug, status, price, categories },
    });
    return product.id;
  }

  beforeAll(async () => {
    t = await createTestPayload();
    admin = await t.createUser('endpoints-admin@example.test', 'admin');
    customer = await t.createUser('endpoints-customer@example.test');

    parentId = (
      await t.payload.create({
        collection: 'categories',
        data: { name: 'Cameras', slug: 'cameras' },
      })
    ).id;
    childId = (
      await t.payload.create({
        collection: 'categories',
        data: { name: 'Dome cameras', slug: 'dome-cameras', parent: parentId },
      })
    ).id;
  });

  afterAll(async () => {
    await t?.close();
  });

  describe('GET /products-by-category/:slug', () => {
    it('returns published products of the category and its subcategories', async () => {
      await createProduct('cat-parent-product', 100_000, [parentId]);
      await createProduct('cat-child-product', 200_000, [childId]);
      await createProduct('cat-draft-product', 300_000, [childId], 'draft');

      const response = await t.api('GET', '/products-by-category/cameras');

      expect(response.status).toBe(200);
      const slugs = (
        response.body.productsResult as { docs: Array<{ slug: string }> }
      ).docs.map((doc) => doc.slug);
      expect(slugs).toEqual(
        expect.arrayContaining(['cat-parent-product', 'cat-child-product']),
      );
      expect(slugs).not.toContain('cat-draft-product');
    });

    it('answers 404 for an unknown category', async () => {
      const response = await t.api('GET', '/products-by-category/missing');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /categories/:id/apply-price-adjustment', () => {
    const path = (id: number) => `/categories/${id}/apply-price-adjustment`;

    it('requires a signed-in administrator', async () => {
      const anonymous = await t.api('POST', path(parentId), {
        body: { action: 'apply' },
      });
      expect(anonymous.status).toBe(401);

      const asCustomer = await t.api('POST', path(parentId), {
        token: customer.token,
        body: { action: 'apply' },
      });
      expect(asCustomer.status).toBe(403);
    });

    it.each([
      ['an unknown action', { action: 'delete' }],
      ['extra fields', { action: 'apply', price: 1 }],
      ['an empty body', {}],
    ])('rejects %s', async (_label, body) => {
      const response = await t.api('POST', path(parentId), {
        token: admin.token,
        body,
      });
      expect(response.status).toBe(400);
    });

    it('applies and clears a percentage discount across subcategories', async () => {
      const category = await t.payload.create({
        collection: 'categories',
        data: {
          name: 'Discounted',
          slug: 'discounted',
          priceAdjustment: { adjustmentType: 'discount', adjustmentValue: 10 },
        },
      });
      const sub = await t.payload.create({
        collection: 'categories',
        data: {
          name: 'Discounted sub',
          slug: 'discounted-sub',
          parent: category.id,
        },
      });
      const productId = await createProduct('discount-me', 1_000_000, [sub.id]);

      const applied = await t.api('POST', path(category.id), {
        token: admin.token,
        body: { action: 'apply' },
      });
      expect(applied.status).toBe(200);

      const discounted = await t.payload.findByID({
        collection: 'products',
        id: productId,
      });
      expect(discounted).toMatchObject({
        price: 1_000_000,
        salePrice: 900_000,
        isOnSale: true,
      });

      const cleared = await t.api('POST', path(category.id), {
        token: admin.token,
        body: { action: 'clear' },
      });
      expect(cleared.status).toBe(200);

      const restored = await t.payload.findByID({
        collection: 'products',
        id: productId,
      });
      expect(restored).toMatchObject({
        price: 1_000_000,
        isOnSale: false,
      });
      expect(restored.salePrice ?? null).toBeNull();
    });

    it('applies an increase from the original price, so repeats do not compound', async () => {
      const category = await t.payload.create({
        collection: 'categories',
        data: {
          name: 'Increase',
          slug: 'increase',
          priceAdjustment: { adjustmentType: 'increase', adjustmentValue: 20 },
        },
      });
      const productId = await createProduct('increase-me', 1_000_000, [
        category.id,
      ]);

      for (let i = 0; i < 2; i += 1) {
        const response = await t.api('POST', path(category.id), {
          token: admin.token,
          body: { action: 'apply' },
        });
        expect(response.status).toBe(200);
      }

      const increased = await t.payload.findByID({
        collection: 'products',
        id: productId,
      });
      expect(increased.price).toBe(1_200_000);

      await t.api('POST', path(category.id), {
        token: admin.token,
        body: { action: 'clear' },
      });

      const restored = await t.payload.findByID({
        collection: 'products',
        id: productId,
      });
      expect(restored.price).toBe(1_000_000);
    });
  });
});
