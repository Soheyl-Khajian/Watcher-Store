import { randomUUID } from 'crypto';
import type { FixtureUser } from './e2e/payload-fixture';
import { createTestApp, TestApp } from './e2e/harness';

// Every error answers { statusCode, error, code, message, details? }: code
// for the storefront to word in its page's language, message in English for
// developers, details listing field problems.
const CODE = /^[A-Z_]+$/;

describe('Error responses (e2e)', () => {
  let t: TestApp;
  let customer: FixtureUser;
  let auth: { Authorization: string };

  beforeAll(async () => {
    t = await createTestApp();
    customer = await t.createUser({ email: 'errors@example.test' });
    auth = { Authorization: `Bearer ${await t.login(customer)}` };
  });

  afterAll(async () => {
    await t?.close();
  });

  const expectShape = (
    body: Record<string, unknown>,
    statusCode: number,
    error: string,
  ) => {
    expect(body).toMatchObject({ statusCode, error });
    expect(body.code).toMatch(CODE);
    expect(typeof body.message).toBe('string');
  };

  it('answers an unknown route with a code', async () => {
    const response = await t.http().get('/no-such-route').expect(404);

    expectShape(response.body, 404, 'Not Found');
    expect(response.body.code).toBe('NOT_FOUND');
    expect(JSON.stringify(response.body)).not.toContain('Cannot GET');
  });

  it('answers a missing login with a code', async () => {
    const response = await t.http().get('/cart').expect(401);
    expectShape(response.body, 401, 'Unauthorized');
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('summarises validation errors and lists the details', async () => {
    const response = await t
      .http()
      .post('/auth/login')
      .send({ email: 'not-an-email', extra: true })
      .expect(400);

    expectShape(response.body, 400, 'Bad Request');
    expect(Array.isArray(response.body.details)).toBe(true);
    expect(response.body.details.length).toBeGreaterThan(0);
  });

  it('answers malformed JSON with a code', async () => {
    const response = await t
      .http()
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400);

    expectShape(response.body, 400, 'Bad Request');
  });

  it('explains a missing Idempotency-Key', async () => {
    const response = await t
      .http()
      .post('/orders')
      .set(auth)
      .send({
        shipping: {
          recipientName: 'Test Customer',
          phone: '09121234567',
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test street 1',
          postalCode: '1234567890',
        },
      })
      .expect(400);

    expectShape(response.body, 400, 'Bad Request');
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('lists invalid shipping fields as details', async () => {
    const productId = await t.createProduct({ price: 100_000 });
    await t
      .http()
      .post('/cart')
      .set(auth)
      .send({ productId, quantity: 1 })
      .expect(201);

    const response = await t
      .http()
      .post('/orders')
      .set(auth)
      .set('Idempotency-Key', randomUUID())
      .send({
        shipping: {
          recipientName: 'Test Customer',
          phone: '12345',
          province: 'Tehran',
          city: 'Tehran',
          address: 'Test street 1',
          postalCode: '123',
        },
      })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_FAILED');
    const details = (response.body.details as string[]).join(' ');
    expect(details).toContain('phone must be a mobile number');
    expect(details).toContain('postalCode must have 10 digits');
  });

  it('does not reveal internal product ids', async () => {
    const response = await t
      .http()
      .post('/cart')
      .set(auth)
      .send({ productId: 987654, quantity: 1 })
      .expect(404);

    expectShape(response.body, 404, 'Not Found');
    expect(JSON.stringify(response.body)).not.toContain('987654');
  });

  it('keeps internal bookkeeping out of order responses', async () => {
    const productId = await t.createProduct({ price: 100_000 });
    await t
      .http()
      .post('/cart')
      .set(auth)
      .send({ productId, quantity: 1 })
      .expect(201);
    const created = await t
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
      .expect(201);

    const admin = await t.createUser({
      email: 'errors-admin@example.test',
      role: 'admin',
    });
    const responses = [
      created.body,
      (await t.http().get('/orders').set(auth).expect(200)).body.items[0],
      (await t.http().get(`/orders/${created.body.id}`).set(auth).expect(200))
        .body,
      (
        await t
          .http()
          .get('/admin/orders')
          .set('Authorization', `JWT ${admin.payloadToken}`)
          .expect(200)
      ).body.items[0],
      (
        await t
          .http()
          .post(`/orders/${created.body.id}/cancel`)
          .set(auth)
          .expect(200)
      ).body,
    ];

    for (const order of responses) {
      expect(order).toHaveProperty('id', created.body.id);
      expect(order).not.toHaveProperty('stockReserved');
      expect(order).not.toHaveProperty('checkoutKey');
    }
  });
});
