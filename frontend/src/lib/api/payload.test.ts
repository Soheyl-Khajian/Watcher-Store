import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAllProducts,
  fetchPageBySlug,
  fetchProducts,
  fetchProductsAndCategoryBySlug,
  fetchProductsByIds,
  PayloadUnavailableError,
} from './payload';

let requested: string[];

function payloadAnswers(respond: () => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(String(url));
      return respond();
    }),
  );
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  requested = [];
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Payload being down must not look like an empty shop.
describe('Payload failures', () => {
  it('returns an empty list when there really is nothing', async () => {
    payloadAnswers(() => json({ docs: [] }));
    await expect(fetchProducts()).resolves.toEqual([]);
  });

  it('throws when Payload answers with an error', async () => {
    payloadAnswers(() => json({ errors: [] }, 500));
    await expect(fetchProducts()).rejects.toBeInstanceOf(
      PayloadUnavailableError,
    );
  });

  it('throws when Payload cannot be reached', async () => {
    payloadAnswers(() => {
      throw new TypeError('fetch failed');
    });
    await expect(fetchProducts()).rejects.toBeInstanceOf(
      PayloadUnavailableError,
    );
  });

  it('treats a 404 as "not found", not as a failure', async () => {
    payloadAnswers(() => json({ errors: [] }, 404));
    await expect(fetchProductsAndCategoryBySlug('missing')).resolves.toEqual({
      category: null,
      productsResult: { docs: [] },
    });
  });

  it('returns null for a page that does not exist', async () => {
    payloadAnswers(() => json({ docs: [] }));
    await expect(fetchPageBySlug('missing')).resolves.toBeNull();
  });

  // Used in the browser by the cart and checkout, which handle null.
  it('reports a failed product lookup as null', async () => {
    payloadAnswers(() => json({}, 503));
    await expect(fetchProductsByIds([1, 2])).resolves.toBeNull();
  });
});

describe('Payload request URLs', () => {
  it('encodes the category slug', async () => {
    payloadAnswers(() =>
      json({ category: null, productsResult: { docs: [] } }),
    );
    await fetchProductsAndCategoryBySlug('a/b?c', 2);
    expect(requested[0]).toContain('/products-by-category/a%2Fb%3Fc?page=2');
  });

  it('encodes page slugs', async () => {
    payloadAnswers(() => json({ docs: [] }));
    await fetchPageBySlug('about&admin=1');
    expect(requested[0]).toContain('about%26admin%3D1');
  });
});

describe('product search', () => {
  it('asks for published products matching the name or SKU', async () => {
    payloadAnswers(() => json({ docs: [], totalPages: 1 }));
    await fetchAllProducts({ search: 'دوربین بولت', page: 2 });

    const params = new URL(requested[0]).searchParams;
    expect(params.get('where[status][equals]')).toBe('published');
    expect(params.get('where[or][0][name][like]')).toBe('دوربین بولت');
    expect(params.get('where[or][1][sku][like]')).toBe('دوربین بولت');
    expect(params.get('page')).toBe('2');
  });

  it('cannot add filters through the search text', async () => {
    payloadAnswers(() => json({ docs: [] }));
    await fetchAllProducts({ search: 'x&where[status][equals]=draft' });

    const params = new URL(requested[0]).searchParams;
    expect(params.getAll('where[status][equals]')).toEqual(['published']);
  });

  it('adds no search filter without a search', async () => {
    payloadAnswers(() => json({ docs: [] }));
    await fetchAllProducts();
    expect(requested[0]).not.toContain('like');
  });
});
