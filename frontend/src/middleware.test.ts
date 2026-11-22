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
  it.each(['/profile', '/checkout', '/payment/verify?orderId=7'])(
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

  it('covers exactly the account pages', () => {
    expect(config.matcher).toEqual([
      '/profile/:path*',
      '/checkout/:path*',
      '/payment/verify',
    ]);
  });
});
