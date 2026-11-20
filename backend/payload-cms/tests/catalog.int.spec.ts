import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

describe('Catalog and content visibility', () => {
  let t: TestPayload;
  let admin: { id: number; token: string };
  let customer: { id: number; token: string };
  let publishedId: number;
  let draftId: number;

  beforeAll(async () => {
    t = await createTestPayload();
    admin = await t.createUser('catalog-admin@example.test', 'admin');
    customer = await t.createUser('catalog-customer@example.test');

    const published = await t.payload.create({
      collection: 'products',
      data: {
        name: 'Published camera',
        sku: 'PUB-1',
        slug: 'published-camera',
        status: 'published',
        price: 1_000_000,
        stock: 3,
      },
    });
    const draft = await t.payload.create({
      collection: 'products',
      data: {
        name: 'Draft camera',
        sku: 'DRAFT-1',
        slug: 'draft-camera',
        status: 'draft',
        price: 2_000_000,
        stock: 3,
      },
    });
    publishedId = published.id;
    draftId = draft.id;

    await t.payload.create({
      collection: 'pages',
      data: { title: 'About us', slug: 'about-us', status: 'published' },
    });
    await t.payload.create({
      collection: 'pages',
      data: { title: 'Upcoming sale', slug: 'upcoming-sale', status: 'draft' },
    });
  });

  afterAll(async () => {
    await t?.close();
  });

  describe('products', () => {
    it('lists only published products to visitors and customers', async () => {
      for (const token of [undefined, customer.token]) {
        const list = await t.api('GET', '/products?depth=0', { token });
        const slugs = (list.body.docs as Array<{ slug: string }>).map(
          (doc) => doc.slug,
        );

        expect(slugs).toContain('published-camera');
        expect(slugs).not.toContain('draft-camera');
      }
    });

    it('does not serve a draft product by id to the public', async () => {
      const visitor = await t.api('GET', `/products/${draftId}`);
      expect(visitor.status).not.toBe(200);

      const asCustomer = await t.api('GET', `/products/${draftId}`, {
        token: customer.token,
      });
      expect(asCustomer.status).not.toBe(200);
    });

    it('shows drafts to administrators', async () => {
      const response = await t.api('GET', `/products/${draftId}`, {
        token: admin.token,
      });
      expect(response.status).toBe(200);
    });

    it('hides the price-adjustment bookkeeping field from the public', async () => {
      await t.payload.update({
        collection: 'products',
        id: publishedId,
        data: { priceAdjustmentBasePrice: 900_000 },
      });

      const visitor = await t.api('GET', `/products/${publishedId}`);
      expect(visitor.status).toBe(200);
      expect(visitor.body).not.toHaveProperty('priceAdjustmentBasePrice');

      const asAdmin = await t.api('GET', `/products/${publishedId}`, {
        token: admin.token,
      });
      expect(asAdmin.body.priceAdjustmentBasePrice).toBe(900_000);
    });

    it('only lets administrators create, change or delete products', async () => {
      const data = {
        name: 'Sneaky',
        sku: 'SNEAKY-1',
        slug: 'sneaky',
        status: 'published',
        price: 1,
      };

      expect(
        (
          await t.api('POST', '/products', {
            token: customer.token,
            body: data,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await t.api('PATCH', `/products/${publishedId}`, {
            token: customer.token,
            body: { price: 1 },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await t.api('DELETE', `/products/${publishedId}`, {
            token: customer.token,
          })
        ).status,
      ).toBe(403);

      const created = await t.api('POST', '/products', {
        token: admin.token,
        body: data,
      });
      expect(created.status).toBe(201);
    });
  });

  describe('pages', () => {
    it('serves only published pages to the public', async () => {
      const list = await t.api('GET', '/pages');
      const slugs = (list.body.docs as Array<{ slug: string }>).map(
        (doc) => doc.slug,
      );

      expect(slugs).toContain('about-us');
      expect(slugs).not.toContain('upcoming-sale');
    });

    it('shows draft pages to administrators', async () => {
      const list = await t.api('GET', '/pages', { token: admin.token });
      const slugs = (list.body.docs as Array<{ slug: string }>).map(
        (doc) => doc.slug,
      );

      expect(slugs).toContain('upcoming-sale');
    });
  });

  describe('categories', () => {
    it('are public to read but only administrators may write', async () => {
      expect((await t.api('GET', '/categories')).status).toBe(200);

      const denied = await t.api('POST', '/categories', {
        token: customer.token,
        body: { name: 'Hacked', slug: 'hacked' },
      });
      expect(denied.status).toBe(403);
    });
  });
});
