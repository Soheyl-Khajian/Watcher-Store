import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

const STOREFRONT = 'http://storefront.test:3002';
const SECRET = 'r'.repeat(48);

interface StorefrontCall {
  url: string;
  authorization: string | null;
  tags: string[];
}

// Content edits tell the storefront to drop its cached copy.
describe('Storefront revalidation', () => {
  let t: TestPayload;
  let calls: StorefrontCall[];
  let storefrontDown = false;
  const realFetch = globalThis.fetch;

  beforeAll(async () => {
    process.env.STOREFRONT_INTERNAL_URL = STOREFRONT;
    process.env.REVALIDATE_SECRET = SECRET;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        if (!url.startsWith(STOREFRONT)) {
          return realFetch(input, init);
        }
        calls.push({
          url,
          authorization: new Headers(init?.headers).get('authorization'),
          tags: JSON.parse(String(init?.body ?? '{}')).tags,
        });
        if (storefrontDown) {
          throw new TypeError('fetch failed');
        }
        return new Response('{}', { status: 200 });
      }),
    );

    t = await createTestPayload();
  });

  beforeEach(() => {
    calls = [];
    storefrontDown = false;
  });

  afterAll(async () => {
    await t?.close();
    vi.unstubAllGlobals();
  });

  const product = (name: string) => ({
    name,
    slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    sku: `SKU-${Math.random().toString(36).slice(2, 10)}`,
    price: 250_000,
    stock: 3,
    status: 'published' as const,
  });

  it('asks the storefront to refresh products after a product is saved', async () => {
    await t.payload.create({
      collection: 'products',
      data: product('Dome cam'),
    });

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      url: `${STOREFRONT}/api/revalidate`,
      authorization: `Bearer ${SECRET}`,
      tags: ['products'],
    });
  });

  it('refreshes products too when a category changes (they show its name)', async () => {
    await t.payload.create({
      collection: 'categories',
      data: { name: 'Cameras', slug: `cameras-${Date.now()}` },
    });

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].tags).toEqual(['categories', 'products']);
  });

  it('refreshes the footer after it is saved', async () => {
    await t.payload.updateGlobal({
      slug: 'footer',
      data: { description: 'New footer text' },
    });

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].tags).toEqual(['footer']);
  });

  it('refreshes after a delete', async () => {
    const created = await t.payload.create({
      collection: 'products',
      data: product('Bullet cam'),
    });
    await vi.waitFor(() => expect(calls).toHaveLength(1));

    await t.payload.delete({ collection: 'products', id: created.id });

    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].tags).toEqual(['products']);
  });

  it('still saves when the storefront cannot be reached', async () => {
    storefrontDown = true;

    const created = await t.payload.create({
      collection: 'products',
      data: product('Doorbell cam'),
    });

    expect(created.id).toBeDefined();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
  });
});
