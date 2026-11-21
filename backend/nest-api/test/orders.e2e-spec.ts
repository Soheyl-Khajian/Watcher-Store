import { randomUUID } from 'crypto';
import { createTestApp, TestApp } from './e2e/harness';

const shipping = {
  recipientName: 'Test Customer',
  phone: '09123456789',
  province: 'Tehran',
  city: 'Tehran',
  address: 'Test street 1',
  postalCode: '1234567890',
};

describe('Orders and payment (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t?.close();
  });

  async function customer(email: string) {
    const token = await t.login(await t.createUser({ email }));
    return { Authorization: `Bearer ${token}` };
  }

  async function addToCart(
    headers: Record<string, string>,
    productId: number,
    quantity: number,
  ) {
    await t
      .http()
      .post('/cart')
      .set(headers)
      .send({ productId, quantity })
      .expect(201);
  }

  function createOrder(headers: Record<string, string>, key = randomUUID()) {
    return t
      .http()
      .post('/orders')
      .set(headers)
      .set('Idempotency-Key', key)
      .send({ shipping });
  }

  async function stockOf(productId: number): Promise<number> {
    const { rows } = await t.db.query(
      `SELECT stock FROM payload_schema.products WHERE id = $1`,
      [productId],
    );
    return Number(rows[0].stock);
  }

  it('requires a UUID v4 Idempotency-Key', async () => {
    const headers = await customer('key@example.test');

    await t.http().post('/orders').set(headers).send({ shipping }).expect(400);
    await t
      .http()
      .post('/orders')
      .set(headers)
      .set('Idempotency-Key', 'not-a-uuid')
      .send({ shipping })
      .expect(400);
  });

  it('refuses to create an order from an empty cart', async () => {
    const headers = await customer('empty@example.test');
    await createOrder(headers).expect(400);
  });

  it('validates shipping details', async () => {
    const headers = await customer('shipping@example.test');
    const productId = await t.createProduct({ price: 100_000 });
    await addToCart(headers, productId, 1);

    await t
      .http()
      .post('/orders')
      .set(headers)
      .set('Idempotency-Key', randomUUID())
      .send({ shipping: { ...shipping, phone: '12345' } })
      .expect(400);
  });

  it('creates a pending order at the current price and empties the cart', async () => {
    const headers = await customer('create@example.test');
    const productId = await t.createProduct({
      price: 2_000_000,
      salePrice: 1_500_000,
      isOnSale: true,
      stock: 5,
    });
    await addToCart(headers, productId, 2);

    const order = await createOrder(headers).expect(201);

    expect(order.body).toMatchObject({
      status: 'pending',
      total: 3_000_000,
      items: [
        expect.objectContaining({
          productId: String(productId),
          quantity: 2,
          price: 1_500_000,
        }),
      ],
    });

    await t
      .http()
      .get('/cart')
      .set(headers)
      .expect(200)
      .expect((res) => expect(res.body.items).toEqual([]));

    // Stock is only taken when the order is paid.
    expect(await stockOf(productId)).toBe(5);
  });

  it('returns the same order when a request is retried with the same key', async () => {
    const headers = await customer('retry@example.test');
    const productId = await t.createProduct({ price: 100_000 });
    await addToCart(headers, productId, 1);
    const key = randomUUID();

    const first = await createOrder(headers, key).expect(201);
    const retry = await createOrder(headers, key).expect(201);

    expect(retry.body.id).toBe(first.body.id);

    const orders = await t.http().get('/orders').set(headers).expect(200);
    expect(orders.body).toHaveLength(1);
  });

  it('pays an order through the simulated gateway and takes the stock', async () => {
    const headers = await customer('pay@example.test');
    const productId = await t.createProduct({ price: 100_000, stock: 4 });
    await addToCart(headers, productId, 3);
    const order = await createOrder(headers).expect(201);

    const initiated = await t
      .http()
      .post('/payment/initiate')
      .set(headers)
      .send({ orderId: order.body.id })
      .expect(201);
    expect(initiated.body.paymentUrl).toContain(`orderId=${order.body.id}`);

    await t
      .http()
      .get('/payment/verify')
      .query({ orderId: order.body.id, status: 'success' })
      .set(headers)
      .expect(200);

    expect(await stockOf(productId)).toBe(1);

    const orders = await t.http().get('/orders').set(headers).expect(200);
    expect(orders.body[0].status).toBe('processing');

    // A paid order cannot be paid again.
    await t
      .http()
      .post('/payment/initiate')
      .set(headers)
      .send({ orderId: order.body.id })
      .expect(409);
  });

  it('cancels the order when the payment fails', async () => {
    const headers = await customer('failed@example.test');
    const productId = await t.createProduct({ price: 100_000, stock: 4 });
    await addToCart(headers, productId, 1);
    const order = await createOrder(headers).expect(201);

    await t
      .http()
      .get('/payment/verify')
      .query({ orderId: order.body.id, status: 'failed' })
      .set(headers)
      .expect(200);

    const orders = await t.http().get('/orders').set(headers).expect(200);
    expect(orders.body[0].status).toBe('cancelled');
    expect(await stockOf(productId)).toBe(4);
  });

  it('lets a customer cancel their own pending order only', async () => {
    const owner = await customer('owner@example.test');
    const stranger = await customer('stranger@example.test');
    const productId = await t.createProduct({ price: 100_000 });
    await addToCart(owner, productId, 1);
    const order = await createOrder(owner).expect(201);

    // Another customer's order looks like it does not exist.
    await t
      .http()
      .post(`/orders/${order.body.id}/cancel`)
      .set(stranger)
      .expect(404);

    const cancelled = await t
      .http()
      .post(`/orders/${order.body.id}/cancel`)
      .set(owner)
      .expect(200);
    expect(cancelled.body.status).toBe('cancelled');

    await t
      .http()
      .post(`/orders/${order.body.id}/cancel`)
      .set(owner)
      .expect(409);
  });

  it("does not let a customer see or pay another customer's order", async () => {
    const owner = await customer('private@example.test');
    const stranger = await customer('snoop@example.test');
    const productId = await t.createProduct({ price: 100_000 });
    await addToCart(owner, productId, 1);
    const order = await createOrder(owner).expect(201);

    const strangerOrders = await t
      .http()
      .get('/orders')
      .set(stranger)
      .expect(200);
    expect(strangerOrders.body).toEqual([]);

    await t
      .http()
      .post('/payment/initiate')
      .set(stranger)
      .send({ orderId: order.body.id })
      .expect(404);
    await t
      .http()
      .get('/payment/verify')
      .query({ orderId: order.body.id, status: 'success' })
      .set(stranger)
      .expect(404);
  });

  // Products are looked up in Payload before the cart is locked, so a slow
  // Payload never holds the customer's cart (or a database connection).
  describe('while Payload is slow', () => {
    afterEach(() => {
      t.payload.mode = 'normal';
    });

    it('does not block other changes to the cart', async () => {
      const headers = await customer('slow-payload@example.test');
      const first = await t.createProduct({ price: 100_000 });
      const second = await t.createProduct({ price: 200_000 });
      await addToCart(headers, first, 1);
      await addToCart(headers, second, 1);

      t.payload.mode = 'slow';
      const ordering = createOrder(headers).then((response) => response);
      // Let the order request reach Payload.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const started = Date.now();
      await t.http().delete(`/cart/${second}`).set(headers).expect(200);
      expect(Date.now() - started).toBeLessThan(1000);

      // The cart changed after its products were looked up.
      const order = await ordering;
      expect(order.status).toBe(409);

      t.payload.mode = 'normal';
      const cart = await t.http().get('/cart').set(headers).expect(200);
      expect(cart.body.items).toEqual([
        expect.objectContaining({ productId: String(first) }),
      ]);
    });

    it('still places the order when the cart did not change', async () => {
      const headers = await customer('slow-unchanged@example.test');
      await addToCart(headers, await t.createProduct({ price: 300_000 }), 2);

      t.payload.mode = 'slow';
      const order = await createOrder(headers).expect(201);

      expect(order.body).toMatchObject({ status: 'pending', total: 600_000 });
    });
  });

  it('accepts large orders above the former 99,999,999 toman cap', async () => {
    const headers = await customer('large-order@example.test');
    const productId = await t.createProduct({ price: 150_000_000, stock: 3 });
    await addToCart(headers, productId, 2);

    const order = await createOrder(headers).expect(201);

    expect(order.body.total).toBe(300_000_000);
    expect(order.body.items[0].price).toBe(150_000_000);
  });

  it('stores amounts as whole toman and order times with a time zone', async () => {
    const { rows } = await t.db.query(`
      SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'nest_schema'
        AND (table_name, column_name) IN
          (('order', 'total'), ('order_item', 'price'), ('order', 'createdAt'))
      ORDER BY table_name, column_name`);

    expect(rows).toEqual([
      expect.objectContaining({
        column_name: 'createdAt',
        data_type: 'timestamp with time zone',
      }),
      expect.objectContaining({
        column_name: 'total',
        numeric_precision: 14,
        numeric_scale: 0,
      }),
      expect.objectContaining({
        column_name: 'price',
        numeric_precision: 14,
        numeric_scale: 0,
      }),
    ]);
  });

  it('expires unpaid orders older than the time limit, and only those', async () => {
    const headers = await customer('expiry@example.test');
    const productId = await t.createProduct({ price: 100_000 });
    await addToCart(headers, productId, 1);
    const stale = await createOrder(headers).expect(201);
    await addToCart(headers, productId, 1);
    const fresh = await createOrder(headers).expect(201);

    // PENDING_ORDER_TTL_HOURS is 24 in the test app.
    await t.db.query(
      `UPDATE nest_schema."order" SET "createdAt" = now() - interval '25 hours' WHERE id = $1`,
      [stale.body.id],
    );

    const { OrderExpiryService } =
      await import('../src/orders/order-expiry.service');
    await t.app.get(OrderExpiryService).expireStalePendingOrders();

    const orders = await t.http().get('/orders').set(headers).expect(200);
    const statusOf = (id: number) =>
      orders.body.find((order: { id: number }) => order.id === id).status;
    expect(statusOf(stale.body.id)).toBe('cancelled');
    expect(statusOf(fresh.body.id)).toBe('pending');
  });
});
