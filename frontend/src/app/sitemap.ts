// frontend/src/app/sitemap.ts -> /sitemap.xml
//
// Every public page in every language this deployment offers: the fixed
// ones, and each published product, post and page and every category from
// the CMS. Each address lists its versions in the other languages. When
// Payload cannot be reached the sitemap still lists the fixed pages.

import type { MetadataRoute } from 'next';
import { fetchSitemapEntries, type SitemapEntry } from '@/lib/api/payload';
import { localeSettings } from '@/i18n/settings';
import { absoluteUrl, languageAlternates } from '@/lib/seo';

// Built per request (cached data underneath), not once at build time when
// Payload may not be running.
export const dynamic = 'force-dynamic';

const FIXED_PAGES = ['/', '/products', '/blog'];

// One entry per language for a path (without its prefix).
function entriesFor(
  path: string,
  extra: Omit<MetadataRoute.Sitemap[number], 'url'> = {},
): MetadataRoute.Sitemap {
  const settings = localeSettings();
  return settings.enabledLocales.map((locale) => {
    const { canonical, languages } = languageAlternates(path, locale, settings);
    return {
      url: absoluteUrl(canonical),
      ...extra,
      alternates: {
        languages: Object.fromEntries(
          Object.entries(languages).map(([tag, href]) => [
            tag,
            absoluteUrl(href),
          ]),
        ),
      },
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixed = FIXED_PAGES.flatMap((path) => entriesFor(path));

  let entries: Awaited<ReturnType<typeof fetchSitemapEntries>>;
  try {
    entries = await fetchSitemapEntries();
  } catch {
    return fixed;
  }

  const under = (prefix: string, docs: SitemapEntry[]) =>
    docs.flatMap((doc) =>
      entriesFor(
        `${prefix}${encodeURIComponent(doc.slug)}`,
        doc.updatedAt ? { lastModified: new Date(doc.updatedAt) } : {},
      ),
    );

  return [
    ...fixed,
    ...under('/products/', entries.products),
    ...under('/categories/', entries.categories),
    ...under('/blog/', entries.posts),
    ...under('/', entries.pages),
  ];
}
