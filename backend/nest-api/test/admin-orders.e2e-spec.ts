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
      await t.payOrder(customerHeaders, order.body.id);
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

  describe('refunds', () => {
    const stockOf = async (productId: string | number) =>
      Number(
        (
          await t.db.query(
            'SELECT stock FROM payload_schema.products WHERE id = $1',
            [productId],
          )
        ).rows[0].stock,
      );

    const productOf = async (orderId: number) =>
      (
        await t.db.query(
          'SELECT "productId" FROM nest_schema.order_item WHERE "orderId" = $1',
          [orderId],
        )
      ).rows[0].productId as string;

    it('cancelling a paid order puts the stock back and flags a refund', async () => {
      const orderId = await placeOrder(true);
      const productId = await productOf(orderId);
      expect(await stockOf(productId)).toBe(9);

      const cancelled = await t
        .http()
        .post(`/admin/orders/${orderId}/cancel`)
        .set(asAdmin())
        .expect(200);

      expect(cancelled.body).toMatchObject({
        status: 'cancelled',
        cancelReason: 'admin',
        refundStatus: 'required',
      });
      expect(await stockOf(productId)).toBe(10);
    });

    it('counts and filters the orders that owe a refund', async () => {
      const owed = await placeOrder(true);
      await t
        .http()
        .post(`/admin/orders/${owed}/cancel`)
        .set(asAdmin())
        .expect(200);
      await placeOrder(true);

      const all = await t
        .http()
        .get('/admin/orders')
        .set(asAdmin())
        .expect(200);
      const onlyRefunds = await t
        .http()
        .get('/admin/orders')
        .query({ refund: 'required', limit: 100 })
        .set(asAdmin())
        .expect(200);

      expect(all.body.refundsRequired).toBeGreaterThanOrEqual(1);
      expect(onlyRefunds.body.totalItems).toBe(all.body.refundsRequired);
      expect(
        onlyRefunds.body.items.every(
          (order: { refundStatus: string }) =>
            order.refundStatus === 'required',
        ),
      ).toBe(true);
      expect(
        onlyRefunds.body.items.map((order: { id: number }) => order.id),
      ).toContain(owed);

      await t
        .http()
        .get('/admin/orders')
        .query({ refund: 'yes' })
        .set(asAdmin())
        .expect(400);
    });

    it('lists the payment to send back, and when it was refunded', async () => {
      const orderId = await placeOrder(true);
      await t
        .http()
        .post(`/admin/orders/${orderId}/cancel`)
        .set(asAdmin())
        .expect(200);

      type Listed = {
        id: number;
        refunds: { amount: number; refundedAt: string | null }[];
      };
      const listed = async () =>
        (
          (
            await t
              .http()
              .get('/admin/orders')
              .query({ limit: 100 })
              .set(asAdmin())
              .expect(200)
          ).body.items as Listed[]
        ).find((order) => order.id === orderId);

      expect((await listed())?.refunds).toEqual([
        expect.objectContaining({ amount: 100_000, refundedAt: null }),
      ]);

      await t
        .http()
        .post(`/admin/orders/${orderId}/mark-refunded`)
        .set(asAdmin())
        .expect(200);
      expect((await listed())?.refunds[0].refundedAt).not.toBeNull();
    });

    it('records a refund once', async () => {
      const orderId = await placeOrder(true);
      await t
        .http()
        .post(`/admin/orders/${orderId}/cancel`)
        .set(asAdmin())
        .expect(200);

      const refunded = await t
        .http()
        .post(`/admin/orders/${orderId}/mark-refunded`)
        .set(asAdmin())
        .expect(200);
      expect(refunded.body.refundStatus).toBe('refunded');

      const again = await t
        .http()
        .post(`/admin/orders/${orderId}/mark-refunded`)
        .set(asAdmin())
        .expect(409);
      expect(again.body.code).toBe('ORDER_NO_REFUND_NEEDED');
    });

    it('does not take a payment for an order that owes a refund', async () => {
      const orderId = await placeOrder(false);
      await t.db.query(
        `UPDATE nest_schema."order" SET "refundStatus" = 'required' WHERE id = $1`,
        [orderId],
      );

      const response = await t
        .http()
        .post('/payment/initiate')
        .set(customerHeaders)
        .send({ orderId })
        .expect(409);
      expect(response.body.code).toBe('ORDER_NOT_PAYABLE');
    });
  });
});
