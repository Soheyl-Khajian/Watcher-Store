// frontend/src/lib/api/payload.ts

import type { Category, Product } from '@/types';
import { env } from '../env';
import type { CacheTag } from '../cache-tags';

const PAYLOAD_API_URL =
  typeof window === 'undefined'
    ? process.env.PAYLOAD_INTERNAL_URL || env.NEXT_PUBLIC_PAYLOAD_URL
    : env.NEXT_PUBLIC_PAYLOAD_URL;

const PUBLISHED_STATUS_FILTER = 'where[status][equals]=published';

// Payload could not be asked (unreachable, or it answered with an error).
// Different from "not found": pages show an error with a retry button
// (app/(main)/error.tsx) instead of an empty shop.
export class PayloadUnavailableError extends Error {
  constructor(endpoint: string, reason: string) {
    super(`Payload request ${endpoint.split('?')[0]} failed: ${reason}`);
    this.name = 'PayloadUnavailableError';
  }
}

// The parsed answer, or null when Payload says the thing does not exist
// (404). Throws PayloadUnavailableError for anything else.
// How long a Payload answer may be served from the cache, and under which
// tags Payload can drop it early (POST /api/revalidate after an edit).
// Products are short-lived: their stock changes at checkout, outside
// Payload, so no edit hook announces it.
interface CachePolicy {
  tags: CacheTag[];
  revalidate: number;
}

const PRODUCTS: CachePolicy = { tags: ['products'], revalidate: 60 };
const PAYLOAD_TIMEOUT_MS = 10_000;
const HOUR = 60 * 60;
const cacheFor = (...tags: CacheTag[]): CachePolicy => ({
  tags,
  revalidate: tags.includes('products') ? PRODUCTS.revalidate : HOUR,
});

async function fetchPayloadAPI(
  endpoint: string,
  cache: CachePolicy,
  options: RequestInit = {},
) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const url = `${PAYLOAD_API_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    // A slow or hung Payload must not hold every page render (and the
    // sitemap) open: give up and show the error page instead.
    signal: AbortSignal.timeout(PAYLOAD_TIMEOUT_MS),
    ...options,
    headers,
  };

  if (process.env.NODE_ENV === 'development') {
    fetchOptions.cache = 'no-store';
  } else {
    const isGetRequest =
      !options.method || options.method.toUpperCase() === 'GET';
    if (isGetRequest) {
      fetchOptions.next = { revalidate: cache.revalidate, tags: cache.tags };
    }
  }

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (error) {
    const failure = new PayloadUnavailableError(
      endpoint,
      error instanceof Error ? error.message : 'unknown error',
    );
    // eslint-disable-next-line no-console
    console.error(failure.message);
    throw failure;
  }

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const failure = new PayloadUnavailableError(endpoint, `HTTP ${res.status}`);
    // eslint-disable-next-line no-console
    console.error(failure.message);
    throw failure;
  }
  return res.json();
}

//------------------------------------------------------------
// PRODUCTS METHODS
//------------------------------------------------------------
export async function fetchProducts() {
  const data = await fetchPayloadAPI(
    `/products?${PUBLISHED_STATUS_FILTER}&limit=12&depth=1`,
    PRODUCTS,
  );
  return data?.docs || [];
}

export async function fetchFeaturedProducts() {
  const data = await fetchPayloadAPI(
    `/products?${PUBLISHED_STATUS_FILTER}&where[isOnSale][equals]=true&limit=12&depth=1`,
    PRODUCTS,
  );
  return data?.docs || [];
}

// One page of published products, optionally only those on sale and/or
// matching a search (name or SKU; every word must match).
export async function fetchAllProducts({
  page = 1,
  limit = 15,
  onSale = false,
  search = '',
}: {
  page?: number;
  limit?: number;
  onSale?: boolean;
  search?: string;
} = {}) {
  const params = new URLSearchParams({
    'where[status][equals]': 'published',
    page: String(page),
    limit: String(limit),
    depth: '1',
  });
  if (onSale) {
    params.set('where[isOnSale][equals]', 'true');
  }
  if (search) {
    params.set('where[or][0][name][like]', search);
    params.set('where[or][1][sku][like]', search);
  }
  return fetchPayloadAPI(`/products?${params.toString()}`, PRODUCTS);
}

export async function fetchProductBySlug(slug: string) {
  const data = await fetchPayloadAPI(
    `/products?${PUBLISHED_STATUS_FILTER}&where[slug][equals]=${encodeURIComponent(slug)}&depth=2`,
    PRODUCTS,
  );
  return data?.docs?.[0] || null;
}

// Returns null when the request itself failed, which is different from an
// empty list (the products really do not exist or are not published).
export async function fetchProductsByIds(
  ids: (string | number)[],
): Promise<Product[] | null> {
  if (ids.length === 0) {
    return [];
  }

  const encodedIds = encodeURIComponent(ids.join(','));
  try {
    const data = await fetchPayloadAPI(
      `/products?${PUBLISHED_STATUS_FILTER}&where[id][in]=${encodedIds}&depth=1&limit=100`,
      PRODUCTS,
    );
    return data?.docs ?? [];
  } catch {
    return null;
  }
}

//------------------------------------------------------------
// CATEGORIES METHODS
//------------------------------------------------------------

export async function fetchCategories() {
  const data = await fetchPayloadAPI(
    '/categories?limit=100',
    cacheFor('categories'),
  );
  return data?.docs || [];
}

export async function fetchParentCategories() {
  const data = await fetchPayloadAPI(
    '/categories?limit=100&where[parent][exists]=false',
    cacheFor('categories'),
  );
  return data?.docs || [];
}

export async function fetchCategoryTree() {
  const data = await fetchPayloadAPI(
    '/categories?limit=200&depth=1',
    cacheFor('categories'),
  );
  const categories: Category[] = data?.docs || [];

  const categoryMap: Record<string, Category> = {};
  const categoryTree: Category[] = [];

  categories.forEach((category) => {
    categoryMap[String(category.id)] = { ...category, children: [] };
  });

  categories.forEach((category) => {
    const parentId =
      typeof category.parent === 'object'
        ? String(category.parent?.id)
        : String(category.parent);

    if (parentId && categoryMap[parentId]) {
      categoryMap[parentId].children?.push(categoryMap[String(category.id)]);
    } else {
      categoryTree.push(categoryMap[String(category.id)]);
    }
  });

  return categoryTree;
}

export async function fetchCategoriesBySlugs(slugs: string[]) {
  const data = await fetchPayloadAPI(
    `/categories?where[slug][in]=${slugs.map(encodeURIComponent).join(',')}&limit=10&depth=1`,
    cacheFor('categories'),
  );

  const fetchedCategories = data?.docs || [];

  const sortedCategories = slugs
    .map((slug) => fetchedCategories.find((cat: Category) => cat.slug === slug))
    .filter(Boolean); // to filter not found items

  return sortedCategories;
}

export async function fetchProductsAndCategoryBySlug(slug: string, page = 1) {
  const limit = 15;
  const data = await fetchPayloadAPI(
    `/products-by-category/${encodeURIComponent(slug)}?page=${page}&limit=${limit}`,
    cacheFor('products', 'categories'),
  );
  return data || { category: null, productsResult: { docs: [] } };
}

//------------------------------------------------------------
// CONTENT METHODS (POSTS, PAGES, FOOTER)
//------------------------------------------------------------
// The newest published posts (for the home page).
export async function fetchPosts() {
  const data = await fetchPayloadAPI(
    `/posts?${PUBLISHED_STATUS_FILTER}&sort=-createdAt&limit=10&depth=2`,
    cacheFor('posts'),
  );
  return data?.docs || [];
}

// One page of published posts, newest first (the blog).
export async function fetchPostsPage({
  page = 1,
  limit = 12,
}: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams({
    'where[status][equals]': 'published',
    sort: '-createdAt',
    page: String(page),
    limit: String(limit),
    depth: '2',
  });
  return fetchPayloadAPI(`/posts?${params.toString()}`, cacheFor('posts'));
}

export async function fetchPostBySlug(slug: string) {
  const data = await fetchPayloadAPI(
    `/posts?${PUBLISHED_STATUS_FILTER}&where[slug][equals]=${encodeURIComponent(slug)}&depth=2`,
    cacheFor('posts'),
  );
  return data?.docs?.[0] || null;
}

export async function fetchFooter() {
  return fetchPayloadAPI('/globals/footer', cacheFor('footer'));
}

export async function fetchPageBySlug(slug: string) {
  const data = await fetchPayloadAPI(
    `/pages?${PUBLISHED_STATUS_FILTER}&where[slug][equals]=${encodeURIComponent(slug)}`,
    cacheFor('pages'),
  );
  return data?.docs?.[0] || null;
}

//------------------------------------------------------------
// SITEMAP
//------------------------------------------------------------

export interface SitemapEntry {
  slug: string;
  updatedAt?: string;
}

// Slugs of everything public, for sitemap.xml (up to 1000 of each).
export async function fetchSitemapEntries(): Promise<{
  products: SitemapEntry[];
  categories: SitemapEntry[];
  posts: SitemapEntry[];
  pages: SitemapEntry[];
}> {
  const list = async (
    collection: string,
    publishedOnly: boolean,
    cache: CachePolicy,
  ): Promise<SitemapEntry[]> => {
    // Every document, 200 at a time (the most the CMS gives out in one
    // answer), up to 50 000.
    const docs: SitemapEntry[] = [];
    for (let page = 1; page <= 250; page += 1) {
      const params = new URLSearchParams({
        limit: '200',
        page: String(page),
        depth: '0',
        'select[slug]': 'true',
        'select[updatedAt]': 'true',
      });
      if (publishedOnly) {
        params.set('where[status][equals]', 'published');
      }
      const data = await fetchPayloadAPI(
        `/${collection}?${params.toString()}`,
        cache,
      );
      docs.push(...((data?.docs ?? []) as SitemapEntry[]));
      if (!data?.hasNextPage) break;
    }
    return docs.filter((doc) => typeof doc.slug === 'string' && doc.slug);
  };

  const [products, categories, posts, pages] = await Promise.all([
    list('products', true, PRODUCTS),
    list('categories', false, cacheFor('categories')),
    list('posts', true, cacheFor('posts')),
    list('pages', true, cacheFor('pages')),
  ]);
  return { products, categories, posts, pages };
}
