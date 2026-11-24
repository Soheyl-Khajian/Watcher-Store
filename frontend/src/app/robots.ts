// frontend/src/app/robots.ts -> /robots.txt
//
// Search engines may index the catalogue and content, not account pages,
// checkout or the API.

import type { MetadataRoute } from 'next';
import { localeSettings } from '@/i18n/settings';
import { absoluteUrl } from '@/lib/seo';

const PRIVATE_PAGES = [
  '/checkout',
  '/profile',
  '/payment/',
  '/login',
  '/register',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        ...localeSettings().enabledLocales.flatMap((locale) =>
          PRIVATE_PAGES.map((page) => `/${locale}${page}`),
        ),
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
