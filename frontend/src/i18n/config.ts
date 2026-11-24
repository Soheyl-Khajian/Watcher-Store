// frontend/src/i18n/config.ts
//
// The languages the storefront is written in. Each language has its own
// hand-written messages (messages/<locale>.json); nothing is translated
// automatically, and catalogue content (products, posts, pages) shows as
// it was entered in the CMS whatever the language.
//
// Every page lives under its language's prefix: /fa/products, /en/products.
// Which languages a deployment offers, and which one a bare address opens
// in, are settings (settings.ts).

export const LOCALES = ['fa', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_INFO: Record<
  Locale,
  {
    dir: 'rtl' | 'ltr';
    // The language tag for Intl (numbers, dates) and <html lang>.
    tag: string;
    // The language's name, in itself, for the language switcher.
    label: string;
  }
> = {
  fa: { dir: 'rtl', tag: 'fa-IR', label: 'فارسی' },
  en: { dir: 'ltr', tag: 'en-US', label: 'English' },
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
  );
}

// Remembers the language of the last page visited, so an address without
// a prefix (an old link, the payment gateway's return) opens in it.
export const LOCALE_COOKIE = 'ws_locale';

// Set by the middleware on each page request, so server components can
// read the page's language without it being passed down to them.
export const LOCALE_HEADER = 'x-watcher-locale';
