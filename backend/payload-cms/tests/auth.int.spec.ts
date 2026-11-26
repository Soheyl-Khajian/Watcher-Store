import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestPayload,
  TEST_FRONTEND_URL,
  TEST_PASSWORD,
  TEST_SERVER_URL,
  type TestPayload,
  REGISTRATION_HEADERS,
} from './helpers/test-payload';

describe('Authentication hardening', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
  });

  afterAll(async () => {
    await t?.close();
  });

  const login = (email: string, password: string) =>
    t.api('POST', '/users/login', { body: { email, password } });

  describe('session cookie', () => {
    it('is HttpOnly, SameSite=Lax and Secure behind https', async () => {
      await t.createUser('cookie@example.test');

      const response = await login('cookie@example.test', TEST_PASSWORD);
      const cookie = response.headers.get('set-cookie') ?? '';

      expect(response.status).toBe(200);
      expect(cookie).toMatch(/payload-token=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Secure/i);
    });
  });

  // Payload authenticates its session cookie only for requests that come
  // from the CMS itself. The storefront never uses this cookie, so it is
  // deliberately not trusted either.
  describe('cookie requests from other sites (CSRF)', () => {
    let cookie: string;

    beforeAll(async () => {
      const admin = await t.createUser('csrf-admin@example.test', 'admin');
      cookie = `payload-token=${admin.token}`;
    });

    const me = (headers: Record<string, string>) =>
      t.api('GET', '/users/me', { headers: { Cookie: cookie, ...headers } });

    it('accepts the cookie from the CMS origin', async () => {
      const response = await me({ Origin: TEST_SERVER_URL });
      expect(response.body.user).toMatchObject({
        email: 'csrf-admin@example.test',
      });
    });

    it('accepts the cookie on same-origin browser requests without Origin', async () => {
      const response = await me({ 'Sec-Fetch-Site': 'same-origin' });
      expect(response.body.user).toMatchObject({
        email: 'csrf-admin@example.test',
      });
    });

    it.each([
      ['an unrelated site', 'https://attacker.example.test'],
      ['the storefront', TEST_FRONTEND_URL],
    ])(
      'ignores the cookie when the request comes from %s',
      async (_label, origin) => {
        const response = await me({ Origin: origin });
        expect(response.body.user).toBeNull();
      },
    );

    it('ignores the cookie on a cross-site request without Origin', async () => {
      const response = await me({ 'Sec-Fetch-Site': 'cross-site' });
      expect(response.body.user).toBeNull();
    });

    it('refuses a cross-site write made with the admin cookie', async () => {
      const response = await t.api('POST', '/globals/footer', {
        headers: { Cookie: cookie, Origin: 'https://attacker.example.test' },
        body: { description: 'defaced' },
      });
      expect(response.status).toBe(403);
    });
  });

  describe('passwords', () => {
    it('rejects a registration with a password shorter than 8 characters', async () => {
      const response = await t.api('POST', '/users', {
        headers: REGISTRATION_HEADERS,
        body: { email: 'short@example.test', password: 'abc1234' },
      });

      expect(response.status).toBe(400);
      const exists = await t.payload.find({
        collection: 'users',
        where: { email: { equals: 'short@example.test' } },
      });
      expect(exists.totalDocs).toBe(0);
    });

    it('accepts a password of exactly 8 characters', async () => {
      const response = await t.api('POST', '/users', {
        headers: REGISTRATION_HEADERS,
        body: { email: 'eight@example.test', password: 'abcd1234' },
      });
      expect(response.status).toBe(201);
    });

    it('rejects changing an existing password to a short one', async () => {
      const user = await t.createUser('change@example.test');

      const response = await t.api('PATCH', `/users/${user.id}`, {
        token: user.token,
        body: { password: 'short' },
      });
      expect(response.status).toBe(400);

      expect((await login('change@example.test', TEST_PASSWORD)).status).toBe(
        200,
      );
    });

    it('still saves other changes when no password is sent', async () => {
      const user = await t.createUser('rename@example.test');

      const response = await t.api('PATCH', `/users/${user.id}`, {
        token: user.token,
        body: { email: 'renamed@example.test' },
      });
      expect(response.status).toBe(200);
    });
  });

  describe('login lockout', () => {
    it('locks an account after 5 failed attempts, even for the right password', async () => {
      await t.createUser('lockout@example.test');

      for (let attempt = 0; attempt < 5; attempt += 1) {
        expect(
          (await login('lockout@example.test', 'wrong-password')).status,
        ).toBe(401);
      }

      const correct = await login('lockout@example.test', TEST_PASSWORD);
      expect(correct.status).not.toBe(200);
      expect(correct.body.token).toBeUndefined();
    });
  });
});
