// Tests for the storefront's backend-for-frontend (/api route handlers),
// with fetch stubbed in place of Nest and Payload.

import { NextRequest } from 'next/server';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  onTestFinished,
} from 'vitest';
import { CSRF_HEADER } from '@/lib/csrf';
import { tokenLifetimeSeconds } from '@/lib/server/bff';
import { POST as login } from './auth/login/route';
import { POST as logout } from './auth/logout/route';
import { GET as me } from './auth/me/route';
import { POST as register } from './auth/register/route';
import * as nest from './nest/[...path]/route';
import { GET as paymentCallback } from './payment/callback/route';

const ORIGIN = 'https://shop.example.test';
const NEST = 'http://nest.internal:3001';
const PAYLOAD = 'http://payload.internal:3000/api';
const COOKIE = '__Host-ws_session';

function jwt(expiresInSeconds: number): string {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${part({ alg: 'HS256' })}.${part({ sub: 1, exp })}.signature`;
}

const USER = { userId: 1, email: 'buyer@example.test', role: 'customer' };

interface Call {
  url: string;
  method: string;
  headers: Headers;
  body: string | undefined;
}

let calls: Call[];

// Answers fetch calls with the first matching route.
function upstream(
  routes: Record<string, (call: Call) => Response | Promise<Response>>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL, init: RequestInit = {}) => {
      const call: Call = {
        url: String(input),
        method: init.method ?? 'GET',
        headers: new Headers(init.headers),
        body: typeof init.body === 'string' ? init.body : undefined,
      };
      calls.push(call);
      const key = `${call.method} ${call.url.split('?')[0]}`;
      const handler = routes[key];
      if (!handler) {
        throw new Error(`unexpected upstream call: ${key}`);
      }
      return handler(call);
    }),
  );
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

// A request from the storefront's own pages.
function fromStorefront(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookie?: string;
    headers?: Record<string, string>;
  } = {},
): NextRequest {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    [CSRF_HEADER]: '1',
    ...init.headers,
  };
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (init.cookie) {
    headers.cookie = `${COOKIE}=${init.cookie}`;
  }
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const params = (path: string) => ({
  params: Promise.resolve({ path: path.split('/') }),
});

function sessionCookieOf(response: Response) {
  const header = response.headers.get('set-cookie') ?? '';
  return {
    header,
    value: /__Host-ws_session=([^;]*)/.exec(header)?.[1],
  };
}

beforeEach(() => {
  calls = [];
  process.env.NEST_INTERNAL_URL = NEST;
  process.env.PAYLOAD_INTERNAL_URL = PAYLOAD;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('tokenLifetimeSeconds', () => {
  it('reads the remaining lifetime from the exp claim', () => {
    expect(tokenLifetimeSeconds(jwt(3600))).toBeGreaterThan(3590);
  });

  it.each(['', 'not-a-jwt', 'a.b.c', jwt(-10)])('refuses %p', (token) => {
    expect(tokenLifetimeSeconds(token)).toBeNull();
  });
});

describe('POST /api/auth/login', () => {
  it('keeps the token in an httpOnly cookie and returns only the user', async () => {
    process.env.TRUSTED_PROXY_HOPS = '1';
    onTestFinished(() => {
      delete process.env.TRUSTED_PROXY_HOPS;
    });
    const token = jwt(3600);
    upstream({
      [`POST ${NEST}/auth/login`]: () => json({ access_token: token }),
      [`GET ${NEST}/auth/profile`]: (call) => {
        expect(call.headers.get('authorization')).toBe(`Bearer ${token}`);
        return json(USER);
      },
    });

    const response = await login(
      fromStorefront('/api/auth/login', {
        method: 'POST',
        body: { email: USER.email, password: 'correct-horse' },
        // One reverse proxy in front (TRUSTED_PROXY_HOPS=1) appended the
        // address it saw; the first entry was written by the client.
        headers: { 'x-forwarded-for': '198.51.100.66, 203.0.113.9' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ user: USER });
    expect(JSON.stringify(body)).not.toContain(token);

    const cookie = sessionCookieOf(response);
    expect(cookie.value).toBe(token);
    expect(cookie.header).toMatch(/HttpOnly/i);
    expect(cookie.header).toMatch(/Secure/i);
    expect(cookie.header).toMatch(/SameSite=lax/i);
    expect(cookie.header).toMatch(/Path=\//);
    expect(cookie.header).toMatch(/Max-Age=3(5\d\d|600)/);

    // Nest sees only the address the proxy saw, and a request id.
    expect(calls[0].headers.get('x-forwarded-for')).toBe('203.0.113.9');
    expect(calls[0].headers.get('x-request-id')).toBeTruthy();
  });

  it("passes on Nest's answer for a wrong password, without a cookie", async () => {
    upstream({
      [`POST ${NEST}/auth/login`]: () =>
        json(
          { statusCode: 401, message: 'ایمیل یا رمز عبور اشتباه است.' },
          401,
        ),
    });

    const response = await login(
      fromStorefront('/api/auth/login', {
        method: 'POST',
        body: { email: USER.email, password: 'wrong-password' },
      }),
    );

    expect(response.status).toBe(401);
    expect((await response.json()).message).toBe(
      'ایمیل یا رمز عبور اشتباه است.',
    );
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('answers 503 when Nest cannot be reached', async () => {
    upstream({
      [`POST ${NEST}/auth/login`]: () => {
        throw new TypeError('fetch failed');
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await login(
      fromStorefront('/api/auth/login', {
        method: 'POST',
        body: { email: USER.email, password: 'whatever-pass' },
      }),
    );

    expect(response.status).toBe(503);
  });

  it('refuses a missing body without calling Nest', async () => {
    upstream({});
    const response = await login(
      fromStorefront('/api/auth/login', { method: 'POST', body: {} }),
    );
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe('cross-site requests', () => {
  const attempt = (headers: Record<string, string>) =>
    login(
      new NextRequest(`${ORIGIN}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify({ email: USER.email, password: 'x'.repeat(10) }),
      }),
    );

  it.each([
    [
      'from another site',
      { origin: 'https://evil.example', [CSRF_HEADER]: '1' },
    ],
    ['without an Origin', { [CSRF_HEADER]: '1' }],
    ['without the CSRF header', { origin: ORIGIN }],
  ])('refuses a request %s', async (_name, headers) => {
    upstream({});
    const response = await attempt(headers as Record<string, string>);
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the user for a valid session', async () => {
    upstream({ [`GET ${NEST}/auth/profile`]: () => json(USER) });

    const response = await me(
      fromStorefront('/api/auth/me', { cookie: jwt(60) }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: USER });
  });

  it('answers no user without a session, without calling Nest', async () => {
    upstream({});
    const response = await me(fromStorefront('/api/auth/me'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
    expect(calls).toHaveLength(0);
  });

  it('clears a session Nest no longer accepts', async () => {
    upstream({
      [`GET ${NEST}/auth/profile`]: () => json({ statusCode: 401 }, 401),
    });

    const response = await me(
      fromStorefront('/api/auth/me', { cookie: 'stale' }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
    expect(sessionCookieOf(response).header).toMatch(/Max-Age=0/);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const response = await logout(
      fromStorefront('/api/auth/logout', { method: 'POST', cookie: jwt(60) }),
    );
    expect(response.status).toBe(204);
    expect(sessionCookieOf(response)).toMatchObject({ value: '' });
    expect(sessionCookieOf(response).header).toMatch(/Max-Age=0/);
  });
});

describe('POST /api/auth/register', () => {
  const registration = (body: unknown) =>
    register(fromStorefront('/api/auth/register', { method: 'POST', body }));

  it('creates the account in Payload', async () => {
    upstream({
      [`POST ${PAYLOAD}/users`]: (call) => {
        expect(JSON.parse(call.body ?? '{}')).toEqual({
          email: 'new@example.test',
          password: 'long-enough',
        });
        return json({ doc: { id: 9 } }, 201);
      },
    });

    const response = await registration({
      email: 'new@example.test',
      password: 'long-enough',
    });
    expect(response.status).toBe(201);
  });

  it('answers 409 with its own code for a taken email', async () => {
    upstream({
      [`POST ${PAYLOAD}/users`]: () =>
        json(
          {
            errors: [
              {
                name: 'ValidationError',
                data: {
                  errors: [
                    {
                      path: 'email',
                      message:
                        'A user with the given email is already registered.',
                    },
                  ],
                },
              },
            ],
          },
          400,
        ),
    });

    const response = await registration({
      email: 'taken@example.test',
      password: 'long-enough',
    });
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('EMAIL_TAKEN');
  });

  it.each([
    [{ email: 'not-an-email', password: 'long-enough' }],
    [{ email: 'a@example.test', password: 'short' }],
    [{ email: 'a@example.test' }],
  ])('refuses %p without calling Payload', async (body) => {
    upstream({});
    expect((await registration(body)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

describe('/api/nest proxy', () => {
  it('forwards an allowed request with the session token', async () => {
    const token = jwt(60);
    upstream({
      [`POST ${NEST}/orders`]: (call) => {
        expect(call.headers.get('authorization')).toBe(`Bearer ${token}`);
        expect(call.headers.get('idempotency-key')).toBe('key-1');
        expect(call.body).toBe(
          JSON.stringify({ shipping: { city: 'Tehran' } }),
        );
        return json({ id: 5 }, 201, { 'X-Request-Id': 'req-1' });
      },
    });

    const response = await nest.POST(
      fromStorefront('/api/nest/orders', {
        method: 'POST',
        cookie: token,
        body: { shipping: { city: 'Tehran' } },
        headers: { 'idempotency-key': 'key-1' },
      }),
      params('orders'),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 5 });
    expect(response.headers.get('x-request-id')).toBe('req-1');
  });

  it('refuses a body larger than any the storefront sends', async () => {
    const big = 'x'.repeat(70 * 1024);
    const response = await nest.POST(
      fromStorefront('/api/nest/orders', {
        method: 'POST',
        cookie: jwt(60),
        body: { note: big },
      }),
      params('orders'),
    );
    expect(response.status).toBe(413);
    expect((await response.json()).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('keeps the query string', async () => {
    upstream({
      [`GET ${NEST}/orders`]: (call) => {
        expect(call.url).toBe(`${NEST}/orders?page=2&limit=10`);
        return json({ items: [] });
      },
    });

    const response = await nest.GET(
      fromStorefront('/api/nest/orders?page=2&limit=10', { cookie: jwt(60) }),
      params('orders'),
    );
    expect(response.status).toBe(200);
  });

  it.each([
    ['GET', 'admin/orders'],
    ['GET', 'health'],
    ['POST', 'auth/login'],
    ['GET', 'payment/callback'],
    ['DELETE', 'orders/5'],
    ['GET', 'cart/..%2Fadmin'],
  ])('refuses %s /%s', async (method, path) => {
    upstream({});
    const handler = nest[method as 'GET' | 'POST' | 'DELETE'];
    const response = await handler(
      fromStorefront(`/api/nest/${path}`, { method, cookie: jwt(60) }),
      params(path),
    );
    expect(response.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it('answers 401 without a session', async () => {
    upstream({});
    const response = await nest.GET(
      fromStorefront('/api/nest/cart'),
      params('cart'),
    );
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('forgets a session Nest rejects', async () => {
    upstream({ [`GET ${NEST}/cart`]: () => json({ statusCode: 401 }, 401) });
    const response = await nest.GET(
      fromStorefront('/api/nest/cart', { cookie: 'revoked' }),
      params('cart'),
    );
    expect(response.status).toBe(401);
    expect(sessionCookieOf(response).header).toMatch(/Max-Age=0/);
  });

  it('refuses a cross-site change', async () => {
    upstream({});
    const response = await nest.POST(
      new NextRequest(`${ORIGIN}/api/nest/cart`, {
        method: 'POST',
        headers: {
          origin: 'https://evil.example',
          cookie: `${COOKIE}=${jwt(60)}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ productId: '1', quantity: 1 }),
      }),
      params('cart'),
    );
    expect(response.status).toBe(403);
    expect(calls).toHaveLength(0);
  });
});

describe('GET /api/payment/callback', () => {
  const callback = () =>
    paymentCallback(
      new NextRequest(`${ORIGIN}/api/payment/callback?Authority=A1&Status=OK`),
    );

  it("passes on Nest's redirect to the result page", async () => {
    upstream({
      [`GET ${NEST}/payment/callback`]: (call) => {
        expect(call.url).toBe(
          `${NEST}/payment/callback?Authority=A1&Status=OK`,
        );
        return new Response(null, {
          status: 302,
          headers: { Location: `${ORIGIN}/payment/result?orderId=7` },
        });
      },
    });

    const response = await callback();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      `${ORIGIN}/payment/result?orderId=7`,
    );
  });

  it.each([
    ['a trailing slash', `${ORIGIN}/payment/result/?orderId=7`],
    [
      'another host for the same page',
      'http://shop.internal/payment/result?orderId=7',
    ],
  ])('keeps the order number through %s', async (_name, location) => {
    upstream({
      [`GET ${NEST}/payment/callback`]: () =>
        new Response(null, { status: 302, headers: { Location: location } }),
    });
    const response = await callback();
    expect(response.headers.get('location')).toBe(
      `${ORIGIN}/payment/result?orderId=7`,
    );
  });

  it.each([
    ['a redirect elsewhere', 'https://evil.example/phish'],
    ['a look-alike path', `${ORIGIN}/payment/resultX`],
    [
      'an order number that is not one',
      `${ORIGIN}/payment/result?orderId=7%3Cx`,
    ],
  ])('never follows %s', async (_name, location) => {
    upstream({
      [`GET ${NEST}/payment/callback`]: () =>
        new Response(null, { status: 302, headers: { Location: location } }),
    });
    const response = await callback();
    expect(response.headers.get('location')).toBe(`${ORIGIN}/payment/result`);
  });

  it('still sends the customer to the result page when Nest is down', async () => {
    upstream({
      [`GET ${NEST}/payment/callback`]: () => {
        throw new TypeError('fetch failed');
      },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await callback();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${ORIGIN}/payment/result`);
  });
});
