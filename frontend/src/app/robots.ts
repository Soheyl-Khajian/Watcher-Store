// frontend/src/app/robots.ts -> /robots.txt
//
// Crawlers may fetch every page but the API. Account pages, checkout,
// login and search results say noindex themselves; blocking them here
// would stop crawlers from reading that, and their addresses could then be
// listed without their content.

import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
