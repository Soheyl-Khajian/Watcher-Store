// frontend/src/i18n/routing.ts
//
// What the middleware does with a request's language prefix:
// - API routes, media and root files pass untouched;
// - an address without a prefix redirects (308) to the visitor's last
//   language if this deployment offers it, otherwise the default one;
// - an address with a prefix is a page in that language. A language this
//   deployment doesn't offer is a 404, which the [locale] layout answers.

import { isLocale, type Locale } from './config';
import { isUnprefixedPath, splitLocale } from './paths';
import type { LocaleSettings } from './settings';

export type LocaleRoute =
  | { kind: 'pass' }
  | { kind: 'redirect'; location: string }
  | { kind: 'page'; locale: Locale; path: string };

export function routeLocale(
  pathname: string,
  search: string,
  settings: LocaleSettings,
  rememberedLocale?: string,
): LocaleRoute {
  if (isUnprefixedPath(pathname)) {
    return { kind: 'pass' };
  }

  const { locale, path } = splitLocale(pathname);
  if (locale) {
    return { kind: 'page', locale, path };
  }

  const target =
    isLocale(rememberedLocale) &&
    settings.enabledLocales.includes(rememberedLocale)
      ? rememberedLocale
      : settings.defaultLocale;
  return {
    kind: 'redirect',
    location: `/${target}${path === '/' ? '' : path}${search}`,
  };
}
