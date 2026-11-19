import { randomUUID } from 'crypto';
import type { FixtureUser } from './e2e/payload-fixture';
import { createTestApp, TestApp } from './e2e/harness';

describe('Admin orders (e2e)', () => {
  let t: TestApp;
  let admin: FixtureUser;
  let customerUser: FixtureUser;
  let customerHeaders: Record<string, string>;

  beforeAll(async () => {
    t = await createTestApp();
    admin = await t.createUser({ email: 'admin@example.test', role: 'admin' });
    customerUser = await t.createUser({ email: 'buyer@example.test' });
    customerHeaders = {
      Authorization: `Bearer ${await t.login(customerUser)}`,
    };
  });

  afterAll(async () => {
    await t?.close();
  });

  const asAdmin = () => ({ Authorization: `JWT ${admin.payloadToken}` });

  async function placeOrder(paid: boolean): Promise<number> {
    const productId = await t.createProduct({ price: 100_000, stock: 10 });
    await t
      .http()
      .post('/cart')
      .set(customerHeaders)
      .send({ productId, quantity: 1 })
      .expect(201);
    const order = await t
      .http()
      .post('/orders')
      .set(customerHeaders)
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

    if (paid) {
      await t
        .http()
        .get('/payment/verify')
        .query({ orderId: order.body.id, status: 'success' })
        .set(customerHeaders)
        .expect(200);
    }
    return order.body.id as number;
  }

  describe('access', () => {
    it('requires a Payload session', async () => {
      await t.http().get('/admin/orders').expect(401);
    });

    it("does not accept the storefront's Nest token", async () => {
      await t.http().get('/admin/orders').set(customerHeaders).expect(401);
    });

    it('rejects a customer Payload session', async () => {
      await t
        .http()
        .get('/admin/orders')
        .set('Authorization', `JWT ${customerUser.payloadToken}`)
        .expect(403);
    });

    it('rejects an unknown Payload session', async () => {
      await t
        .http()
        .get('/admin/orders')
        .set('Authorization', 'JWT aaaa.bbbb.cccc')
        .expect(401);
    });
  });

  it('lists every order, paginated, for an administrator', async () => {
    await placeOrder(false);
    await placeOrder(false);

    const page = await t
      .http()
      .get('/admin/orders')
      .query({ page: 1, limit: 1 })
      .set(asAdmin())
      .expect(200);

    expect(page.body).toMatchObject({ page: 1, limit: 1 });
    expect(page.body.items).toHaveLength(1);
    expect(page.body.totalItems).toBeGreaterThanOrEqual(2);
  });

  it('ships and completes a paid order', async () => {
    const orderId = await placeOrder(true);

    const shipped = await t
      .http()
      .post(`/admin/orders/${orderId}/ship`)
      .set(asAdmin())
      .send({ trackingCode: 'TRK-123' })
      .expect(200);
    expect(shipped.body).toMatchObject({
      status: 'shipped',
      trackingCode: 'TRK-123',
    });

    const completed = await t
      .http()
      .post(`/admin/orders/${orderId}/complete`)
      .set(asAdmin())
      .expect(200);
    expect(completed.body.status).toBe('completed');
  });

  it('refuses to ship an unpaid order', async () => {
    const orderId = await placeOrder(false);

    await t
      .http()
      .post(`/admin/orders/${orderId}/ship`)
      .set(asAdmin())
      .send({})
      .expect(409);
  });

  it('rejects an invalid tracking code', async () => {
    const orderId = await placeOrder(true);

    await t
      .http()
      .post(`/admin/orders/${orderId}/ship`)
      .set(asAdmin())
      .send({ trackingCode: 'not valid!' })
      .expect(400);
  });
});
