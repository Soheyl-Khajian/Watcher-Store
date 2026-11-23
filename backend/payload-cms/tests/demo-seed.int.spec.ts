import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDemo, type SeedDemoResult } from '../src/seed/demo';
import { PAGES, POSTS, PRODUCTS } from '../src/seed/demoData';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

const ADMIN = {
  email: 'demo-admin@example.test',
  password: 'demo-admin-password',
};
const CUSTOMER = {
  email: 'demo-customer@example.test',
  password: 'demo-customer-password',
};

// The fields of a product (depth 1) these tests look at.
interface DemoProductDoc {
  status: string;
  isOnSale: boolean;
  price: number;
  salePrice: number;
  gallery: Array<{ image: { url: string } }>;
  categories: Array<{ slug: string }>;
  specifications: unknown[];
}

describe('Demo seed', () => {
  let t: TestPayload;
  let first: SeedDemoResult;
  let second: SeedDemoResult;
  let ownProductId: number;

  beforeAll(async () => {
    t = await createTestPayload();
    // The store's own product with a slug the demo also uses: it must be
    // left exactly as it is.
    const own = await t.payload.create({
      collection: 'products',
      data: {
        name: 'My own plug',
        sku: 'OWN-1',
        slug: 'smart-wifi-plug',
        status: 'draft',
        price: 123_000,
        stock: 1,
      },
    });
    ownProductId = own.id;

    first = await seedDemo(t.payload, { admin: ADMIN, customer: CUSTOMER });
    second = await seedDemo(t.payload, { admin: ADMIN, customer: CUSTOMER });
  }, 300_000);

  afterAll(async () => {
    await t?.close();
  });

  it('creates the whole demo store on an empty database', () => {
    expect(first.categories.created).toBeGreaterThan(20);
    expect(first.products).toEqual({
      created: PRODUCTS.length - 1,
      existing: 1,
    });
    expect(first.posts.created).toBe(POSTS.length);
    expect(first.pages.created).toBe(PAGES.length + 1);
    expect(first.media.created).toBeGreaterThan(30);
    expect(first.footer).toBe('set');
    expect(first.admin).toBe('created');
    expect(first.customer).toBe('created');
  });

  it('changes nothing when run again', () => {
    expect(second.categories.created).toBe(0);
    expect(second.products.created).toBe(0);
    expect(second.posts.created).toBe(0);
    expect(second.pages.created).toBe(0);
    expect(second.media.created).toBe(0);
    expect(second.footer).toBe('kept');
    expect(second.admin).toBe('exists');
    expect(second.customer).toBe('exists');
  });

  it('leaves the store’s own product with the same slug alone', async () => {
    const own = await t.payload.findByID({
      collection: 'products',
      id: ownProductId,
      depth: 0,
    });
    expect(own.name).toBe('My own plug');
    expect(own.price).toBe(123_000);
    expect(own.status).toBe('draft');
  });

  it('publishes products with photos, categories and a working sale', async () => {
    const res = await t.api(
      'GET',
      '/products?where[slug][equals]=hybrid-solar-inverter-5kw&depth=1',
    );
    const product = (res.body.docs as DemoProductDoc[])[0];
    expect(product.status).toBe('published');
    expect(product.isOnSale).toBe(true);
    expect(product.salePrice).toBeLessThan(product.price);
    expect(product.gallery).toHaveLength(2);
    expect(product.gallery[0].image.url).toMatch(
      /\/api\/media\/file\/.+\.webp$/,
    );
    expect(product.categories[0].slug).toBe('inverters-controllers');
    expect(product.specifications.length).toBeGreaterThan(0);
  });

  it('shows the posts and pages to visitors', async () => {
    const posts = await t.api('GET', '/posts?limit=50');
    expect(posts.body.totalDocs).toBe(POSTS.length);
    const credits = await t.api(
      'GET',
      '/pages?where[slug][equals]=image-credits',
    );
    expect(JSON.stringify(credits.body)).toContain('commons.wikimedia.org');
  });

  it('creates a customer who can log in, and an administrator', async () => {
    const login = await t.api('POST', '/users/login', { body: CUSTOMER });
    expect(login.status).toBe(200);
    const adminLogin = await t.api('POST', '/users/login', { body: ADMIN });
    expect(adminLogin.status).toBe(200);

    const roleOf = async (email: string) =>
      (
        await t.payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          depth: 0,
        })
      ).docs[0]?.role;
    expect(await roleOf(CUSTOMER.email)).toBe('customer');
    expect(await roleOf(ADMIN.email)).toBe('admin');
  });
});
