// frontend/src/app/sitemap.ts -> /sitemap.xml
//
// Every public page: the fixed ones, and each published product, post and
// page and every category from the CMS. When Payload cannot be reached the
// sitemap still lists the fixed pages.

import type { MetadataRoute } from 'next';
import { fetchSitemapEntries, type SitemapEntry } from '@/lib/api/payload';
import { absoluteUrl } from '@/lib/seo';

// Built per request (cached data underneath), not once at build time when
// Payload may not be running.
export const dynamic = 'force-dynamic';

const FIXED_PAGES = ['/', '/products', '/blog'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed: MetadataRoute.Sitemap = FIXED_PAGES.map((path) => ({
    url: absoluteUrl(path),
  }));

  let entries: Awaited<ReturnType<typeof fetchSitemapEntries>>;
  try {
    entries = await fetchSitemapEntries();
  } catch {
    return fixed;
  }

  const under = (prefix: string, docs: SitemapEntry[]) =>
    docs.map((doc) => ({
      url: absoluteUrl(`${prefix}${encodeURIComponent(doc.slug)}`),
      ...(doc.updatedAt ? { lastModified: new Date(doc.updatedAt) } : {}),
    }));

  return [
    ...fixed,
    ...under('/products/', entries.products),
    ...under('/categories/', entries.categories),
    ...under('/blog/', entries.posts),
    ...under('/', entries.pages),
  ];
}
