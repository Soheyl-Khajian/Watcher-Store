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

    it('includes products from every level of subcategories', async () => {
      const grandchild = await t.payload.create({
        collection: 'categories',
        data: {
          name: 'Dome cameras 4K',
          slug: 'dome-cameras-4k',
          parent: childId,
        },
      });
      await createProduct('cat-grandchild-product', 400_000, [grandchild.id]);

      const response = await t.api('GET', '/products-by-category/cameras');
      const slugs = (
        response.body.productsResult as { docs: Array<{ slug: string }> }
      ).docs.map((doc) => doc.slug);

      expect(slugs).toContain('cat-grandchild-product');
    });

    describe('paging', () => {
      const paging = async (query: string) => {
        const response = await t.api(
          'GET',
          `/products-by-category/cameras${query}`,
        );
        expect(response.status).toBe(200);
        return response.body.productsResult as {
          limit: number;
          page: number;
        };
      };

      it('defaults to 15 products on page 1', async () => {
        expect(await paging('')).toMatchObject({ limit: 15, page: 1 });
      });

      it('accepts a page size within the cap', async () => {
        expect((await paging('?limit=24')).limit).toBe(24);
      });

      // The category has several products by now, so page 2 of a
      // one-per-page listing exists. (Payload reports page 1 for a page
      // past the end.)
      it('accepts a page number', async () => {
        expect(await paging('?page=2&limit=1')).toMatchObject({
          limit: 1,
          page: 2,
        });
      });

      // Without a cap a single request could load the whole catalog with
      // its relationships.
      it('caps the page size at 48', async () => {
        expect((await paging('?limit=1000000')).limit).toBe(48);
      });

      it.each(['0', '-5', 'abc', '15abc', '1.5', ''])(
        'falls back to the defaults for limit=%p and page=%p',
        async (value) => {
          expect(await paging(`?limit=${value}&page=${value}`)).toMatchObject({
            limit: 15,
            page: 1,
          });
        },
      );
    });

    // An administrator can make two categories each other's parent; that
    // must not take the endpoint down.
    it('survives a cycle in the category tree', async () => {
      const a = await t.payload.create({
        collection: 'categories',
        data: { name: 'Loop A', slug: 'loop-a' },
      });
      const b = await t.payload.create({
        collection: 'categories',
        data: { name: 'Loop B', slug: 'loop-b', parent: a.id },
      });
      // Saving a loop is refused now (Categories validateParent); data saved
      // before that check could still hold one, so it is written directly.
      await t.payload.db.updateOne({
        collection: 'categories',
        id: a.id,
        data: { parent: b.id },
      });
      await createProduct('loop-product', 100_000, [b.id]);

      const response = await t.api('GET', '/products-by-category/loop-a');

      expect(response.status).toBe(200);
      const slugs = (
        response.body.productsResult as { docs: Array<{ slug: string }> }
      ).docs.map((doc) => doc.slug);
      expect(slugs).toEqual(['loop-product']);
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

    async function adjustedCategory(
      slug: string,
      adjustmentType: 'discount' | 'increase',
      adjustmentValue: number,
    ) {
      return t.payload.create({
        collection: 'categories',
        data: {
          name: slug,
          slug,
          priceAdjustment: { adjustmentType, adjustmentValue },
        },
      });
    }

    const product = (id: number) =>
      t.payload.findByID({ collection: 'products', id });

    const run = (categoryId: number, action: 'apply' | 'clear') =>
      t.api('POST', path(categoryId), {
        token: admin.token,
        body: { action },
      });

    it('leaves a hand-set sale price alone, on apply and on clear', async () => {
      const category = await adjustedCategory('manual-sale', 'discount', 10);
      const manual = await createProduct('manual-sale-product', 1_000_000, [
        category.id,
      ]);
      await t.payload.update({
        collection: 'products',
        id: manual,
        data: { isOnSale: true, salePrice: 700_000 },
      });
      const plain = await createProduct('plain-product', 1_000_000, [
        category.id,
      ]);

      const applied = await run(category.id, 'apply');
      expect(applied.status).toBe(200);
      expect(applied.body.skippedProducts).toEqual([
        expect.objectContaining({ id: manual, reason: 'manual_sale' }),
      ]);
      expect(await product(manual)).toMatchObject({ salePrice: 700_000 });
      expect(await product(plain)).toMatchObject({ salePrice: 900_000 });

      expect((await run(category.id, 'clear')).status).toBe(200);
      expect(await product(manual)).toMatchObject({
        salePrice: 700_000,
        isOnSale: true,
      });
      expect(await product(plain)).toMatchObject({ isOnSale: false });
    });

    it('skips a product whose discount rounds to its price, and updates the rest', async () => {
      const category = await adjustedCategory('tiny-discount', 'discount', 1);
      const cheap = await createProduct('cheap-product', 10, [category.id]);
      const normal = await createProduct('normal-product', 1_000_000, [
        category.id,
      ]);

      const applied = await run(category.id, 'apply');

      expect(applied.status).toBe(200);
      expect(applied.body.skippedProducts).toEqual([
        expect.objectContaining({ id: cheap, reason: 'no_discount' }),
      ]);
      expect(await product(normal)).toMatchObject({ salePrice: 990_000 });
    });

    it('refuses a 100% discount on the category', async () => {
      const response = await t.api('POST', '/categories', {
        token: admin.token,
        body: {
          name: 'Free',
          slug: 'free',
          priceAdjustment: { adjustmentType: 'discount', adjustmentValue: 100 },
        },
      });
      expect(response.status).toBe(400);
    });
  });
});
