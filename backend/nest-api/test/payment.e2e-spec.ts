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

interface PaymentRow {
  orderId: number;
  gateway: string;
  authority: string;
  amountRial: string;
  status: string;
  refId: string | null;
  verifiedAt: Date | null;
  gatewayResponse: unknown;
}

// Every payment attempt is recorded, with the amount sent to the gateway,
// and its result is applied to the order exactly once.
describe('Payments (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t?.close();
  });

  async function placeOrder(email: string, price = 100_000, quantity = 3) {
    const headers = {
      Authorization: `Bearer ${await t.login(await t.createUser({ email }))}`,
    };
    const productId = await t.createProduct({ price, stock: 10 });
    await t
      .http()
      .post('/cart')
      .set(headers)
      .send({ productId, quantity })
      .expect(201);
    const order = await t
      .http()
      .post('/orders')
      .set(headers)
      .set('Idempotency-Key', randomUUID())
      .send({ shipping })
      .expect(201);
    return {
      headers,
      productId,
      orderId: order.body.id as number,
      total: order.body.total as number,
    };
  }

  const initiate = (headers: Record<string, string>, orderId: number) =>
    t.http().post('/payment/initiate').set(headers).send({ orderId });

  const verify = (
    headers: Record<string, string>,
    orderId: number,
    status: 'success' | 'failed' = 'success',
  ) => t.http().get('/payment/verify').query({ orderId, status }).set(headers);

  async function paymentsOf(orderId: number): Promise<PaymentRow[]> {
    const { rows } = await t.db.query(
      'SELECT * FROM nest_schema.payment WHERE "orderId" = $1 ORDER BY id',
      [orderId],
    );
    return rows;
  }

  async function orderStatus(orderId: number): Promise<string> {
    const { rows } = await t.db.query(
      'SELECT status FROM nest_schema."order" WHERE id = $1',
      [orderId],
    );
    return rows[0].status;
  }

  async function stockOf(productId: number): Promise<number> {
    const { rows } = await t.db.query(
      'SELECT stock FROM payload_schema.products WHERE id = $1',
      [productId],
    );
    return Number(rows[0].stock);
  }

  it('records a pending payment for the order total in rial', async () => {
    const { headers, orderId, total } = await placeOrder('start@example.test');

    const response = await initiate(headers, orderId).expect(201);

    const [payment] = await paymentsOf(orderId);
    expect(payment).toMatchObject({
      gateway: 'mock',
      status: 'pending',
      amountRial: String(total * 10),
      refId: null,
      verifiedAt: null,
    });

    // The simulated gateway sends the customer straight back.
    const url = new URL(response.body.paymentUrl);
    expect(url.origin + url.pathname).toBe(
      'http://localhost:3002/payment/verify',
    );
    expect(url.searchParams.get('orderId')).toBe(String(orderId));
    expect(url.searchParams.get('Authority')).toBe(payment.authority);
  });

  it('marks the payment paid and the order processing', async () => {
    const { headers, orderId } = await placeOrder('paid@example.test');
    await initiate(headers, orderId).expect(201);

    await verify(headers, orderId).expect(200);

    const [payment] = await paymentsOf(orderId);
    expect(payment.status).toBe('paid');
    expect(payment.refId).toEqual(expect.any(String));
    expect(payment.verifiedAt).not.toBeNull();
    expect(payment.gatewayResponse).toMatchObject({ mock: true });
    expect(await orderStatus(orderId)).toBe('processing');
  });

  it('does not settle a payment twice', async () => {
    const { headers, orderId } = await placeOrder('twice@example.test');
    await initiate(headers, orderId).expect(201);
    await verify(headers, orderId).expect(200);
    const [before] = await paymentsOf(orderId);

    await verify(headers, orderId).expect(409);
    await verify(headers, orderId, 'failed').expect(409);

    const [after] = await paymentsOf(orderId);
    expect(after).toEqual(before);
    expect(await orderStatus(orderId)).toBe('processing');
  });

  it('applies two simultaneous confirmations only once', async () => {
    const { headers, orderId, productId } = await placeOrder(
      'race@example.test',
      100_000,
      2,
    );
    await initiate(headers, orderId).expect(201);

    const responses = await Promise.all([
      verify(headers, orderId),
      verify(headers, orderId),
    ]);

    for (const response of responses) {
      expect([200, 409]).toContain(response.status);
    }
    const payments = await paymentsOf(orderId);
    expect(payments.map((p) => p.status)).toEqual(['paid']);
    expect(await orderStatus(orderId)).toBe('processing');
    // Reserved once at checkout, never taken again.
    expect(await stockOf(productId)).toBe(8);
  });

  it('marks the payment failed and cancels the order', async () => {
    const { headers, orderId, productId } = await placeOrder(
      'failed-payment@example.test',
    );
    await initiate(headers, orderId).expect(201);

    await verify(headers, orderId, 'failed').expect(200);

    const [payment] = await paymentsOf(orderId);
    expect(payment.status).toBe('failed');
    expect(await orderStatus(orderId)).toBe('cancelled');
    expect(await stockOf(productId)).toBe(10);
  });

  it('refuses to confirm an order with no payment in progress', async () => {
    const { headers, orderId } = await placeOrder('no-payment@example.test');

    await verify(headers, orderId).expect(409);

    expect(await orderStatus(orderId)).toBe('pending');
  });

  it('settles the latest attempt when the customer retried', async () => {
    const { headers, orderId } = await placeOrder('retry@example.test');
    await initiate(headers, orderId).expect(201);
    await initiate(headers, orderId).expect(201);

    await verify(headers, orderId).expect(200);

    const payments = await paymentsOf(orderId);
    expect(payments.map((p) => p.status)).toEqual(['pending', 'paid']);
    expect(new Set(payments.map((p) => p.authority)).size).toBe(2);
  });
});
