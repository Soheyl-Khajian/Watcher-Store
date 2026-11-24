import { describe, expect, it } from 'vitest';
import { localizeHref, splitLocale } from './paths';
import { routeLocale } from './routing';
import { parseLocaleSettings, type LocaleSettings } from './settings';

describe('language settings', () => {
  it('defaults to Persian with every language offered', () => {
    expect(parseLocaleSettings({})).toEqual({
      defaultLocale: 'fa',
      enabledLocales: ['fa', 'en'],
      timeZone: 'Asia/Tehran',
    });
  });

  it('reads the default and the offered languages', () => {
    expect(
      parseLocaleSettings({
        DEFAULT_LOCALE: 'en',
        ENABLED_LOCALES: ' en ',
        STORE_TIME_ZONE: 'Europe/Berlin',
      }),
    ).toEqual({
      defaultLocale: 'en',
      enabledLocales: ['en'],
      timeZone: 'Europe/Berlin',
    });
  });

  it.each([
    [{ DEFAULT_LOCALE: 'de' }, /DEFAULT_LOCALE must be one of/],
    [{ ENABLED_LOCALES: 'fa,de' }, /ENABLED_LOCALES may contain/],
    [
      { DEFAULT_LOCALE: 'en', ENABLED_LOCALES: 'fa' },
      /must be one of ENABLED_LOCALES/,
    ],
    [{ STORE_TIME_ZONE: 'Mars/Olympus' }, /STORE_TIME_ZONE must be/],
  ])('refuses %j', (env, message) => {
    expect(() => parseLocaleSettings(env)).toThrow(message);
  });
});

describe('language prefixes', () => {
  it('splits the prefix from a path', () => {
    expect(splitLocale('/en/products/x')).toEqual({
      locale: 'en',
      path: '/products/x',
    });
    expect(splitLocale('/fa')).toEqual({ locale: 'fa', path: '/' });
    expect(splitLocale('/products')).toEqual({
      locale: null,
      path: '/products',
    });
  });

  it.each([
    ['/', '/en'],
    ['/products?q=lock#top', '/en/products?q=lock#top'],
    ['/fa/products', '/fa/products'],
    ['/api/auth/me', '/api/auth/me'],
    ['/uploads/a.webp', '/uploads/a.webp'],
    ['/sitemap.xml', '/sitemap.xml'],
    ['https://example.com/x', 'https://example.com/x'],
    ['//example.com/x', '//example.com/x'],
    ['#reviews', '#reviews'],
    ['mailto:shop@example.com', 'mailto:shop@example.com'],
  ])('localizes %s as %s in English', (href, expected) => {
    expect(localizeHref('en', href)).toBe(expected);
  });
});

describe('routing by language', () => {
  const both: LocaleSettings = {
    defaultLocale: 'fa',
    enabledLocales: ['fa', 'en'],
    timeZone: 'Asia/Tehran',
  };
  const persianOnly: LocaleSettings = { ...both, enabledLocales: ['fa'] };

  it('serves a prefixed page in its language', () => {
    expect(routeLocale('/en/products', '', both)).toEqual({
      kind: 'page',
      locale: 'en',
      path: '/products',
    });
  });

  it('sends an unprefixed address to the default language', () => {
    expect(routeLocale('/', '', both)).toEqual({
      kind: 'redirect',
      location: '/fa',
    });
    expect(routeLocale('/products', '?q=lock', both)).toEqual({
      kind: 'redirect',
      location: '/fa/products?q=lock',
    });
  });

  it('prefers the language of the last visit, if offered', () => {
    expect(routeLocale('/payment/result', '?orderId=7', both, 'en')).toEqual({
      kind: 'redirect',
      location: '/en/payment/result?orderId=7',
    });
    expect(routeLocale('/products', '', persianOnly, 'en')).toEqual({
      kind: 'redirect',
      location: '/fa/products',
    });
    expect(routeLocale('/products', '', both, 'xx')).toEqual({
      kind: 'redirect',
      location: '/fa/products',
    });
  });

  it('leaves API routes, media and root files alone', () => {
    for (const path of ['/api/health', '/uploads/a.webp', '/robots.txt']) {
      expect(routeLocale(path, '', both)).toEqual({ kind: 'pass' });
    }
  });
});
