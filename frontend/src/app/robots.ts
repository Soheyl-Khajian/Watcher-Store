// frontend/src/app/robots.ts -> /robots.txt
//
// Search engines may index the catalogue and content, not account pages,
// checkout or the API.

import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/checkout',
        '/profile',
        '/payment/',
        '/login',
        '/register',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
