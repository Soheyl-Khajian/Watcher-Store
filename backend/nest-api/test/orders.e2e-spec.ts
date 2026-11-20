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
});
