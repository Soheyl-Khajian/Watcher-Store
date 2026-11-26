import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { config, middleware } from './middleware';

// vitest.config.mts sets NEXT_PUBLIC_FRONTEND_URL to an https address, so
// the session cookie is the __Host- one.
const SHOP = 'https://shop.example.test';

const visit = (path: string, cookie?: string) =>
  middleware(
    new NextRequest(`${SHOP}${path}`, {
      headers: cookie ? { cookie } : {},
    }),
  );

describe('language middleware', () => {
  it('redirects an address without a language to the default one', () => {
    const response = visit('/products?q=lock');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`${SHOP}/fa/products?q=lock`);
  });

  // The target depends on the visitor's cookies.
  it('lets no browser or CDN keep a redirect', () => {
    for (const response of [visit('/products'), visit('/fa/checkout')]) {
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toBe('Cookie');
    }
  });

  it('serves a page whose slug has a dot in its language', () => {
    const response = visit('/en/products/omega-3861.1');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-request-x-watcher-locale')).toBe(
      'en',
    );
    expect(visit('/products/omega-3861.1').headers.get('location')).toBe(
      `${SHOP}/fa/products/omega-3861.1`,
    );
  });

  it('sends a language prefix in capitals to its lowercase form', () => {
    expect(visit('/EN/products').headers.get('location')).toBe(
      `${SHOP}/en/products`,
    );
  });

  it("redirects to the last visit's language", () => {
    const response = visit('/payment/result?orderId=7', 'ws_locale=en');
    expect(response.headers.get('location')).toBe(
      `${SHOP}/en/payment/result?orderId=7`,
    );
  });

  it('remembers the language of the page visited', () => {
    const cookie = visit('/en/products').headers.get('set-cookie') ?? '';
    expect(cookie).toContain('ws_locale=en');
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(
      visit('/en/products', 'ws_locale=en').headers.get('set-cookie'),
    ).toBeNull();
  });

  it('leaves API routes alone', () => {
    const response = visit('/api/auth/me');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('keeps API answers out of every cache', () => {
    expect(visit('/api/auth/me').headers.get('cache-control')).toBe(
      'private, no-store',
    );
    expect(visit('/fa/products').headers.get('cache-control')).toBeNull();
  });
});

describe('account page middleware', () => {
  it.each(['/profile', '/checkout', '/payment/result?orderId=7'])(
    'sends a visitor without a session from %s to the login page',
    (path) => {
      const response = visit(`/en${path}`);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        `${SHOP}/en/login?next=${encodeURIComponent(path)}`,
      );
    },
  );

  it('lets a visitor with a session cookie through', () => {
    const response = visit('/fa/profile', '__Host-ws_session=token');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('ignores a cookie with the wrong name or no value', () => {
    expect(visit('/fa/checkout', 'ws_session=token').status).toBe(307);
    expect(visit('/fa/checkout', '__Host-ws_session=').status).toBe(307);
  });

  it('leaves public pages open', () => {
    const response = visit('/fa/products');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('content security policy middleware', () => {
  const nonceOf = (csp: string | null) =>
    /'nonce-([^']+)'/.exec(csp ?? '')?.[1];

  it('gives each response a fresh nonce', () => {
    const first = nonceOf(visit('/fa').headers.get('content-security-policy'));
    const second = nonceOf(visit('/fa').headers.get('content-security-policy'));
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('hands the same policy to the page render, which reads the nonce', () => {
    const response = visit('/fa');
    expect(
      response.headers.get('x-middleware-request-content-security-policy'),
    ).toBe(response.headers.get('content-security-policy'));
  });

  it('upgrades insecure requests on an https storefront', () => {
    expect(visit('/fa').headers.get('content-security-policy')).toContain(
      'upgrade-insecure-requests',
    );
  });

  it('sets the policy on redirects too', () => {
    expect(visit('/products').headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
    const response = visit('/fa/checkout');
    expect(response.status).toBe(307);
    expect(response.headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
  });

  it('runs for pages and API routes but not build assets', () => {
    const [matcher] = config.matcher;
    const matches = (path: string) => new RegExp(`^${matcher}$`).test(path);
    expect(matches('/')).toBe(true);
    expect(matches('/products/camera')).toBe(true);
    expect(matches('/api/auth/me')).toBe(true);
    expect(matches('/_next/static/chunks/app.js')).toBe(false);
    expect(matches('/_next/image')).toBe(false);
    expect(matches('/uploads/camera.png')).toBe(false);
    expect(matches('/icon.svg')).toBe(false);
  });
});

describe('a language this deployment does not offer', () => {
  it('is neither the page language nor remembered', async () => {
    const original = process.env.ENABLED_LOCALES;
    process.env.ENABLED_LOCALES = 'fa';
    vi.resetModules();
    try {
      const { middleware: persianOnly } = await import('./middleware');
      const response = persianOnly(new NextRequest(`${SHOP}/en/products`));
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(
        response.headers.get('x-middleware-request-x-watcher-locale'),
      ).toBeNull();
    } finally {
      process.env.ENABLED_LOCALES = original;
      vi.resetModules();
    }
  });
});
