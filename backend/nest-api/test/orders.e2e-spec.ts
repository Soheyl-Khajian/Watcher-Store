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

    // Stock is reserved as soon as the order is placed.
    expect(await stockOf(productId)).toBe(3);
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
    expect(orders.body.items).toHaveLength(1);
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
    expect(orders.body.items[0].status).toBe('processing');

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
    expect(orders.body.items[0].status).toBe('cancelled');
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
    expect(strangerOrders.body.items).toEqual([]);

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
      orders.body.items.find((order: { id: number }) => order.id === id).status;
    expect(statusOf(stale.body.id)).toBe('cancelled');
    expect(statusOf(fresh.body.id)).toBe('pending');
  });

  // Stock is reserved when the order is placed, so a customer can never pay
  // for something that sold out meanwhile, and released when it is cancelled.
  describe('stock reservation', () => {
    const shippingBody = {
      shipping: {
        recipientName: 'Test Customer',
        phone: '09123456789',
        province: 'Tehran',
        city: 'Tehran',
        address: 'Test street 1',
        postalCode: '1234567890',
      },
    };

    it('reserves stock at checkout and does not take it again on payment', async () => {
      const headers = await customer('reserve@example.test');
      const productId = await t.createProduct({ price: 100_000, stock: 5 });
      await addToCart(headers, productId, 2);

      const order = await createOrder(headers).expect(201);
      expect(await stockOf(productId)).toBe(3);

      await t
        .http()
        .get('/payment/verify')
        .query({ orderId: order.body.id, status: 'success' })
        .set(headers)
        .expect(200);
      expect(await stockOf(productId)).toBe(3);
    });

    it('refuses an order when stock ran out, keeping the cart', async () => {
      const headers = await customer('sold-out@example.test');
      const productId = await t.createProduct({ price: 100_000, stock: 2 });
      await addToCart(headers, productId, 2);
      await t.db.query(
        'UPDATE payload_schema.products SET stock = 1 WHERE id = $1',
        [productId],
      );

      await createOrder(headers).expect(409);

      expect(await stockOf(productId)).toBe(1);
      const cart = await t.http().get('/cart').set(headers).expect(200);
      expect(cart.body.items).toHaveLength(1);
      const orders = await t.http().get('/orders').set(headers).expect(200);
      expect(orders.body.items).toEqual([]);
    });

    it('lets only one of two customers buy the last unit', async () => {
      const productId = await t.createProduct({ price: 100_000, stock: 1 });
      const first = await customer('race-1@example.test');
      const second = await customer('race-2@example.test');
      await addToCart(first, productId, 1);
      await addToCart(second, productId, 1);

      const results = await Promise.all([
        createOrder(first),
        createOrder(second),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await stockOf(productId)).toBe(0);
    });

    it('returns stock when the customer cancels', async () => {
      const headers = await customer('cancel-stock@example.test');
      const productId = await t.createProduct({ price: 100_000, stock: 5 });
      await addToCart(headers, productId, 2);
      const order = await createOrder(headers).expect(201);

      await t
        .http()
        .post(`/orders/${order.body.id}/cancel`)
        .set(headers)
        .expect(200);

      expect(await stockOf(productId)).toBe(5);
    });

    it('returns stock when an unpaid order expires', async () => {
      const headers = await customer('expire-stock@example.test');
      const productId = await t.createProduct({ price: 100_000, stock: 5 });
      await addToCart(headers, productId, 2);
      const order = await createOrder(headers).expect(201);
      await t.db.query(
        `UPDATE nest_schema."order" SET "createdAt" = now() - interval '25 hours' WHERE id = $1`,
        [order.body.id],
      );

      const { OrderExpiryService } =
        await import('../src/orders/order-expiry.service');
      expect(
        await t.app.get(OrderExpiryService).expireStalePendingOrders(),
      ).toBe(1);

      expect(await stockOf(productId)).toBe(5);
    });

    // Orders placed before stock was reserved at checkout hold no stock.
    describe('orders placed before reservation existed', () => {
      async function legacyOrder(email: string, stock: number) {
        const headers = await customer(email);
        const productId = await t.createProduct({ price: 100_000, stock });
        await addToCart(headers, productId, 2);
        const order = await t
          .http()
          .post('/orders')
          .set(headers)
          .set('Idempotency-Key', randomUUID())
          .send(shippingBody)
          .expect(201);
        // As if placed before this change: nothing reserved.
        await t.db.query(
          `UPDATE nest_schema."order" SET "stockReserved" = false WHERE id = $1`,
          [order.body.id],
        );
        await t.db.query(
          'UPDATE payload_schema.products SET stock = $2 WHERE id = $1',
          [productId, stock],
        );
        return { headers, productId, orderId: order.body.id as number };
      }

      it('takes the stock when such an order is paid', async () => {
        const { headers, productId, orderId } = await legacyOrder(
          'legacy-pay@example.test',
          5,
        );

        await t
          .http()
          .get('/payment/verify')
          .query({ orderId, status: 'success' })
          .set(headers)
          .expect(200);

        expect(await stockOf(productId)).toBe(3);
      });

      it('does not invent stock when such an order is cancelled', async () => {
        const { headers, productId, orderId } = await legacyOrder(
          'legacy-cancel@example.test',
          5,
        );

        await t
          .http()
          .post(`/orders/${orderId}/cancel`)
          .set(headers)
          .expect(200);

        expect(await stockOf(productId)).toBe(5);
      });
    });
  });

  describe('order history', () => {
    it('lists the customer orders newest first, a page at a time', async () => {
      const headers = await customer('history@example.test');
      const productId = await t.createProduct({ price: 100_000, stock: 10 });
      const ids: number[] = [];
      for (let n = 0; n < 3; n += 1) {
        await addToCart(headers, productId, 1);
        ids.push((await createOrder(headers).expect(201)).body.id);
      }

      const firstPage = await t
        .http()
        .get('/orders')
        .query({ page: 1, limit: 2 })
        .set(headers)
        .expect(200);
      expect(firstPage.body).toMatchObject({
        page: 1,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
      });
      expect(firstPage.body.items.map((o: { id: number }) => o.id)).toEqual([
        ids[2],
        ids[1],
      ]);

      const secondPage = await t
        .http()
        .get('/orders')
        .query({ page: 2, limit: 2 })
        .set(headers)
        .expect(200);
      expect(secondPage.body.items.map((o: { id: number }) => o.id)).toEqual([
        ids[0],
      ]);
    });

    it.each([
      ['page', { page: 0 }],
      ['limit', { limit: 51 }],
      ['limit', { limit: 'ten' }],
    ])('rejects an invalid %s', async (_label, query) => {
      const headers = await customer(
        `bad-paging-${JSON.stringify(query)}@example.test`.replace(
          /[^a-z0-9@.-]/g,
          '',
        ),
      );
      await t.http().get('/orders').query(query).set(headers).expect(400);
    });

    it('shows one order with its items, only to its owner', async () => {
      const owner = await customer('detail@example.test');
      const stranger = await customer('detail-stranger@example.test');
      const productId = await t.createProduct({ price: 250_000 });
      await addToCart(owner, productId, 2);
      const order = await createOrder(owner).expect(201);

      const detail = await t
        .http()
        .get(`/orders/${order.body.id}`)
        .set(owner)
        .expect(200);
      expect(detail.body).toMatchObject({
        id: order.body.id,
        total: 500_000,
        items: [
          expect.objectContaining({
            productId: String(productId),
            quantity: 2,
          }),
        ],
      });

      await t.http().get(`/orders/${order.body.id}`).set(stranger).expect(404);
      await t.http().get('/orders/999999').set(owner).expect(404);
      await t.http().get('/orders/abc').set(owner).expect(400);
    });
  });
});
