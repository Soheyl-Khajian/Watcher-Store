import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  MAX_PUBLIC_DEPTH,
  MAX_PUBLIC_LIMIT,
} from '../src/hooks/limitPublicReads';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

describe('Content rules', () => {
  let t: TestPayload;
  let admin: { id: number; token: string };
  let customer: { id: number; token: string };

  beforeAll(async () => {
    t = await createTestPayload();
    admin = await t.createUser('rules-admin@example.test', 'admin');
    customer = await t.createUser('rules-customer@example.test');
    await t.payload.create({
      collection: 'categories',
      data: { name: 'Cameras', slug: 'cameras' },
    });
  });

  afterAll(async () => {
    await t?.close();
  });

  describe('public reads', () => {
    it.each(['limit=0', 'pagination=false', 'limit=100000', 'limit=-5'])(
      'caps ?%s at the public limit',
      async (query) => {
        const response = await t.api('GET', `/categories?${query}`);
        expect(response.status).toBe(200);
        expect(response.body.limit).toBe(MAX_PUBLIC_LIMIT);
      },
    );

    it('keeps a reasonable limit as asked', async () => {
      const response = await t.api('GET', '/categories?limit=12');
      expect(response.body.limit).toBe(12);
    });

    it('caps the depth of populated relations', async () => {
      // d -> c -> b -> a: depth 2 fills in c and b, and leaves a as its id.
      let parent: number | undefined;
      for (const slug of ['depth-a', 'depth-b', 'depth-c', 'depth-d']) {
        const doc = await t.payload.create({
          collection: 'categories',
          data: { name: slug, slug, parent },
        });
        parent = doc.id;
      }
      const response = await t.api(
        'GET',
        '/categories?where[slug][equals]=depth-d&depth=10',
        { token: customer.token },
      );
      expect(MAX_PUBLIC_DEPTH).toBe(2);
      interface Node {
        slug: string;
        parent: Node | number | null;
      }
      const d = (response.body.docs as Node[])[0];
      const c = d.parent as Node;
      const b = c.parent as Node;
      expect(c.slug).toBe('depth-c');
      expect(b.slug).toBe('depth-b');
      expect(typeof b.parent).toBe('number');
    });

    it('does not limit administrators', async () => {
      const response = await t.api('GET', '/categories?limit=0', {
        token: admin.token,
      });
      expect(response.body.limit).toBe(0);
    });
  });

  describe('slugs', () => {
    it('normalises a slug typed by hand', async () => {
      const product = await t.payload.create({
        collection: 'products',
        data: {
          name: 'Dome camera',
          sku: 'SLUG-1',
          slug: '  Dome Camera 4MP ',
          status: 'draft',
          price: 1_000_000,
          stock: 1,
        },
      });
      expect(product.slug).toBe('dome-camera-4mp');
    });

    it('makes one from the title when it is left empty', async () => {
      // The slug is left out on purpose: the hook makes it.
      const data = { title: 'Shipping Policy', status: 'draft' as const };
      const page = await t.payload.create({
        collection: 'pages',
        data: data as typeof data & { slug: string },
      });
      expect(page.slug).toBe('shipping-policy');
    });
  });

  describe('category tree', () => {
    it('refuses a category under itself or its own subcategory', async () => {
      const top = await t.payload.create({
        collection: 'categories',
        data: { name: 'Security', slug: 'security' },
      });
      const middle = await t.payload.create({
        collection: 'categories',
        data: { name: 'Alarms', slug: 'alarms', parent: top.id },
      });
      const bottom = await t.payload.create({
        collection: 'categories',
        data: { name: 'Sirens', slug: 'sirens', parent: middle.id },
      });

      for (const parent of [top.id, bottom.id]) {
        const response = await t.api('PATCH', `/categories/${top.id}`, {
          token: admin.token,
          body: { parent },
        });
        expect(response.status).toBe(400);
      }

      // Moving a category elsewhere is fine.
      const cameras = await t.payload.find({
        collection: 'categories',
        where: { slug: { equals: 'cameras' } },
      });
      const moved = await t.api('PATCH', `/categories/${bottom.id}`, {
        token: admin.token,
        body: { parent: cameras.docs[0].id },
      });
      expect(moved.status).toBe(200);
    });
  });

  describe('posts', () => {
    const post = (author: number, thumbnail: number, slug: string) => ({
      title: `Post ${slug}`,
      excerpt: 'Short summary',
      slug,
      author,
      thumbnail,
      status: 'published',
    });

    it('accepts only administrators as authors', async () => {
      const image = await t.uploadImage(admin.token);
      const refused = await t.api('POST', '/posts', {
        token: admin.token,
        body: post(customer.id, image, 'by-customer'),
      });
      expect(refused.status).toBe(400);

      const accepted = await t.api('POST', '/posts', {
        token: admin.token,
        body: post(admin.id, image, 'by-admin'),
      });
      expect(accepted.status).toBe(201);
    });

    it('dates a post published without a date', async () => {
      const image = await t.uploadImage(admin.token);
      const before = Date.now();
      const response = await t.api('POST', '/posts', {
        token: admin.token,
        body: post(admin.id, image, 'undated'),
      });
      const date = (response.body.doc as { publishedDate?: string })
        .publishedDate;
      expect(date && Date.parse(date)).toBeGreaterThanOrEqual(before - 1000);
    });
  });

  describe('footer links', () => {
    it.each(['javascript:alert(1)', 'data:text/html,hi', '//evil.example'])(
      'refuses %p',
      async (url) => {
        const response = await t.api('POST', '/globals/footer', {
          token: admin.token,
          body: { socialLinks: [{ platform: 'Telegram', url }] },
        });
        expect(response.status).toBe(400);
      },
    );

    it.each(['https://t.me/watcher', '/contact-us', 'mailto:hi@example.test'])(
      'accepts %p',
      async (url) => {
        const response = await t.api('POST', '/globals/footer', {
          token: admin.token,
          body: { socialLinks: [{ platform: 'Telegram', url }] },
        });
        expect(response.status).toBe(200);
      },
    );
  });
});
