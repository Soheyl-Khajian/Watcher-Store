import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
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

describe('account page middleware', () => {
  it.each(['/profile', '/checkout', '/payment/result?orderId=7'])(
    'sends a visitor without a session from %s to the login page',
    (path) => {
      const response = visit(path);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(
        `${SHOP}/login?next=${encodeURIComponent(path)}`,
      );
    },
  );

  it('lets a visitor with a session cookie through', () => {
    const response = visit('/profile', '__Host-ws_session=token');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('ignores a cookie with the wrong name or no value', () => {
    expect(visit('/checkout', 'ws_session=token').status).toBe(307);
    expect(visit('/checkout', '__Host-ws_session=').status).toBe(307);
  });

  it('leaves public pages open', () => {
    const response = visit('/products');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('content security policy middleware', () => {
  const nonceOf = (csp: string | null) =>
    /'nonce-([^']+)'/.exec(csp ?? '')?.[1];

  it('gives each response a fresh nonce', () => {
    const first = nonceOf(visit('/').headers.get('content-security-policy'));
    const second = nonceOf(visit('/').headers.get('content-security-policy'));
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it('hands the same policy to the page render, which reads the nonce', () => {
    const response = visit('/');
    expect(
      response.headers.get('x-middleware-request-content-security-policy'),
    ).toBe(response.headers.get('content-security-policy'));
  });

  it('upgrades insecure requests on an https storefront', () => {
    expect(visit('/').headers.get('content-security-policy')).toContain(
      'upgrade-insecure-requests',
    );
  });

  it('sets the policy on the login redirect too', () => {
    const response = visit('/checkout');
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
