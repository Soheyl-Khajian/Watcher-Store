// frontend/src/i18n/paths.ts
//
// Adding and removing the language prefix of a path. Pages are under
// /<locale>/; API routes, media and files at the root (sitemap.xml,
// robots.txt, icons) are not.

import { isLocale, type Locale } from './config';

// Paths that never take a language prefix: API routes, media, build files,
// and files at the root (/sitemap.xml, /robots.txt). Only a root path
// counts as a file: a page's slug may have a dot in it (/products/v2.0).
const UNPREFIXED =
  /^\/(?:api|uploads|images|_next)(?:\/|$)|^\/[^/]+\.[a-z0-9]+$/i;

export function isUnprefixedPath(pathname: string): boolean {
  return UNPREFIXED.test(pathname);
}

// "/en/products/x" -> { locale: "en", path: "/products/x" }; a path without
// a language prefix comes back with locale null.
export function splitLocale(pathname: string): {
  locale: Locale | null;
  path: string;
} {
  const [, first = '', ...rest] = pathname.split('/');
  if (isLocale(first)) {
    return { locale: first, path: `/${rest.join('/')}` };
  }
  return { locale: null, path: pathname || '/' };
}

// "/products?q=x" in English -> "/en/products?q=x". Anything that is not a
// path on this site (other sites, #anchors, mailto:), or already has a
// prefix, or never takes one, is returned as is.
export function localizeHref(locale: Locale, href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) {
    return href;
  }
  const end = href.search(/[?#]/);
  const pathname = end === -1 ? href : href.slice(0, end);
  const suffix = end === -1 ? '' : href.slice(end);
  if (isUnprefixedPath(pathname) || splitLocale(pathname).locale) {
    return href;
  }
  return `/${locale}${pathname === '/' ? '' : pathname}${suffix}`;
}
