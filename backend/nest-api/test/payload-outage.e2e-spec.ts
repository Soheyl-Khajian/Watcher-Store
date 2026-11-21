import { randomUUID } from 'crypto';
import type { FixtureUser } from './e2e/payload-fixture';
import { createTestApp, TestApp } from './e2e/harness';

// How the API behaves when Payload is down, stalls or answers nonsense:
// unavailable or too slow -> 503 (try again later), nonsense -> 502, and
// nothing is half-done.
describe('When Payload is unhealthy (e2e)', () => {
  let t: TestApp;
  let user: FixtureUser;
  let admin: FixtureUser;
  let auth: { Authorization: string };
  let productId: number;

  beforeAll(async () => {
    t = await createTestApp({ PAYLOAD_TIMEOUT_MS: '500' });
    user = await t.createUser({ email: 'outage@example.test' });
    admin = await t.createUser({
      email: 'outage-admin@example.test',
      role: 'admin',
    });
    auth = { Authorization: `Bearer ${await t.login(user)}` };
    productId = await t.createProduct({ price: 100_000, stock: 5 });
  });

  afterEach(() => {
    t.payload.mode = 'normal';
  });

  afterAll(async () => {
    await t?.close();
  });

  const login = (password = 'correct-horse-battery') =>
    t.http().post('/auth/login').send({ email: user.email, password });

  describe('login', () => {
    it.each(['error', 'hang-up'] as const)(
      'answers 503, not "wrong password", when Payload is %s',
      async (mode) => {
        t.payload.mode = mode;
        await login().expect(503);
      },
    );

    it('gives up after the timeout instead of hanging', async () => {
      t.payload.mode = 'slow';
      const started = Date.now();

      await login().expect(503);
      expect(Date.now() - started).toBeLessThan(1500);
    });

    it('answers 502 when Payload sends something that is not JSON', async () => {
      t.payload.mode = 'garbage';
      await login().expect(502);
    });

    it('still answers 401 for a wrong password when Payload is fine', async () => {
      await login('wrong-password').expect(401);
    });

    it('works again once Payload recovers', async () => {
      t.payload.mode = 'error';
      await login().expect(503);

      t.payload.mode = 'normal';
      await login().expect(200);
    });
  });

  describe('adding to the cart', () => {
    const add = () =>
      t.http().post('/cart').set(auth).send({ productId, quantity: 1 });

    it.each(['error', 'hang-up', 'slow'] as const)(
      'answers 503 when Payload is %s',
      async (mode) => {
        t.payload.mode = mode;
        await add().expect(503);
      },
    );

    it('answers 502 for a response that is not JSON', async () => {
      t.payload.mode = 'garbage';
      await add().expect(502);
    });
  });

  it('keeps the cart when an order cannot be checked against Payload', async () => {
    await t
      .http()
      .post('/cart')
      .set(auth)
      .send({ productId, quantity: 2 })
      .expect(201);

    t.payload.mode = 'error';
    await t
      .http()
      .post('/orders')
      .set(auth)
      .set('Idempotency-Key', randomUUID())
      .send({
        shipping: {
          recipientName: 'Test Customer',
          phone: '09123456789',
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test street 1',
          postalCode: '1234567890',
        },
      })
      .expect(503);

    t.payload.mode = 'normal';
    const cart = await t.http().get('/cart').set(auth).expect(200);
    expect(cart.body.items).toEqual([
      expect.objectContaining({ productId: String(productId) }),
    ]);
  });

  it('answers 503 to the admin Orders view when Payload is down', async () => {
    t.payload.mode = 'hang-up';
    await t
      .http()
      .get('/admin/orders')
      .set('Authorization', `JWT ${admin.payloadToken}`)
      .expect(503);
  });
});
