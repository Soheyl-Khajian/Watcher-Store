import { randomUUID } from 'crypto';
import { createTestApp, TestApp } from './e2e/harness';

// Production-like limits for this file only. Counters are kept per client
// and per route, so each route below has its own budget.
const LIMITS = {
  RATE_LIMIT_PER_MINUTE: '30',
  RATE_LIMIT_LOGIN_PER_MINUTE: '5',
  RATE_LIMIT_ORDERS_PER_MINUTE: '3',
};

describe('HTTP hardening (e2e)', () => {
  let t: TestApp;
  let auth: { Authorization: string };
  let email: string;

  beforeAll(async () => {
    t = await createTestApp(LIMITS);
    const user = await t.createUser({ email: 'limits@example.test' });
    email = user.email;
    // Uses one of the five login attempts allowed per minute.
    auth = { Authorization: `Bearer ${await t.login(user)}` };
  });

  afterAll(async () => {
    await t?.close();
  });

  describe('security headers', () => {
    it('sets helmet headers and hides the framework', async () => {
      const response = await t.http().get('/health').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('rate limits', () => {
    it('allows 5 login attempts a minute, then answers 429', async () => {
      // One attempt was used in beforeAll.
      for (let attempt = 2; attempt <= 5; attempt += 1) {
        await t
          .http()
          .post('/auth/login')
          .send({ email, password: 'wrong-password' })
          .expect(401);
      }

      const blocked = await t
        .http()
        .post('/auth/login')
        .send({ email, password: 'correct-horse-battery' })
        .expect(429);
      expect(blocked.headers['retry-after']).toBeDefined();
    });

    // Without a trusted proxy, X-Forwarded-For comes from the client and
    // must not give an attacker a fresh budget.
    it('ignores a spoofed X-Forwarded-For header', async () => {
      await t
        .http()
        .post('/auth/login')
        .set('X-Forwarded-For', '203.0.113.7')
        .send({ email, password: 'wrong-password' })
        .expect(429);
    });

    it('limits order attempts to 3 a minute', async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        // An empty cart is refused, but the attempt still counts.
        await t
          .http()
          .post('/orders')
          .set(auth)
          .set('Idempotency-Key', randomUUID())
          .send({ shipping: {} })
          .expect(400);
      }

      await t
        .http()
        .post('/orders')
        .set(auth)
        .set('Idempotency-Key', randomUUID())
        .send({ shipping: {} })
        .expect(429);
    });

    it('limits other routes to 30 requests a minute', async () => {
      for (let request = 1; request <= 30; request += 1) {
        await t.http().get('/cart').set(auth).expect(200);
      }
      await t.http().get('/cart').set(auth).expect(429);
    });

    // Container health checks poll this endpoint constantly.
    it('never limits the health check', async () => {
      for (let request = 1; request <= 40; request += 1) {
        await t.http().get('/health').expect(200);
      }
    });
  });

  describe('CORS', () => {
    it('allows only the methods the API uses, without credentials', async () => {
      const response = await t
        .http()
        .options('/cart')
        .set('Origin', 'http://localhost:3002')
        .set('Access-Control-Request-Method', 'POST');

      const methods = String(response.headers['access-control-allow-methods']);
      expect(methods.split(',')).toEqual(
        expect.arrayContaining(['GET', 'POST', 'DELETE']),
      );
      expect(methods).not.toMatch(/PUT/);
      expect(
        response.headers['access-control-allow-credentials'],
      ).toBeUndefined();
    });

    it('does not allow other origins', async () => {
      const response = await t
        .http()
        .get('/health')
        .set('Origin', 'https://attacker.example.test');

      expect(response.headers['access-control-allow-origin']).not.toBe(
        'https://attacker.example.test',
      );
    });
  });

  it('rejects request bodies larger than 32 KB', async () => {
    await t
      .http()
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send(
        JSON.stringify({
          email: 'x@example.test',
          password: 'y'.repeat(40_000),
        }),
      )
      .expect(413);
  });
});
