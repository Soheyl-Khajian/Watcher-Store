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

const RESULT_PAGE = 'http://localhost:3002/payment/verify';

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

// The payment flow with the simulated gateway: every attempt is recorded
// with the amount sent to the gateway, the customer comes back through
// GET /payment/callback, and the result is applied to the order once.
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

  // Starts a payment and returns its authority.
  async function initiate(
    headers: Record<string, string>,
    orderId: number,
  ): Promise<string> {
    const response = await t
      .http()
      .post('/payment/initiate')
      .set(headers)
      .send({ orderId })
      .expect(201);
    return new URL(response.body.paymentUrl).searchParams.get(
      'Authority',
    ) as string;
  }

  // The customer's browser arriving back from the gateway.
  const callback = (Authority: string, Status: 'OK' | 'NOK' = 'OK') =>
    t.http().get('/payment/callback').query({ Authority, Status });

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

    const response = await t
      .http()
      .post('/payment/initiate')
      .set(headers)
      .send({ orderId })
      .expect(201);

    const [payment] = await paymentsOf(orderId);
    expect(payment).toMatchObject({
      gateway: 'mock',
      status: 'pending',
      amountRial: String(total * 10),
      refId: null,
      verifiedAt: null,
    });

    // The simulated gateway sends the customer straight back to the API.
    const url = new URL(response.body.paymentUrl);
    expect(url.origin + url.pathname).toBe(
      'http://localhost:3001/payment/callback',
    );
    expect(url.searchParams.get('Authority')).toBe(payment.authority);
  });

  it('marks the payment paid and sends the customer to the result page', async () => {
    const { headers, orderId } = await placeOrder('paid@example.test');
    const authority = await initiate(headers, orderId);

    const response = await callback(authority).expect(302);

    expect(response.headers.location).toBe(`${RESULT_PAGE}?orderId=${orderId}`);
    const [payment] = await paymentsOf(orderId);
    expect(payment.status).toBe('paid');
    expect(payment.refId).toEqual(expect.any(String));
    expect(payment.verifiedAt).not.toBeNull();
    expect(payment.gatewayResponse).toMatchObject({ mock: true });
    expect(await orderStatus(orderId)).toBe('processing');
  });

  it('ignores a replayed callback', async () => {
    const { headers, orderId } = await placeOrder('twice@example.test');
    const authority = await initiate(headers, orderId);
    await callback(authority).expect(302);
    const [before] = await paymentsOf(orderId);

    await callback(authority).expect(302);
    await callback(authority, 'NOK').expect(302);

    const [after] = await paymentsOf(orderId);
    expect(after).toEqual(before);
    expect(await orderStatus(orderId)).toBe('processing');
  });

  it('applies two simultaneous callbacks only once', async () => {
    const { headers, orderId, productId } = await placeOrder(
      'race@example.test',
      100_000,
      2,
    );
    const authority = await initiate(headers, orderId);

    await Promise.all([
      callback(authority).expect(302),
      callback(authority).expect(302),
    ]);

    const payments = await paymentsOf(orderId);
    expect(payments.map((p) => p.status)).toEqual(['paid']);
    expect(await orderStatus(orderId)).toBe('processing');
    // Reserved once at checkout, never taken again.
    expect(await stockOf(productId)).toBe(8);
  });

  it('marks the payment failed and cancels the order on NOK', async () => {
    const { headers, orderId, productId } = await placeOrder(
      'failed-payment@example.test',
    );
    const authority = await initiate(headers, orderId);

    await callback(authority, 'NOK').expect(302);

    const [payment] = await paymentsOf(orderId);
    expect(payment.status).toBe('failed');
    expect(await orderStatus(orderId)).toBe('cancelled');
    expect(await stockOf(productId)).toBe(10);
  });

  it('sends an unknown authority to the result page without an order', async () => {
    const response = await callback(`MOCK-${randomUUID()}`).expect(302);
    expect(response.headers.location).toBe(RESULT_PAGE);
  });

  it('refuses a malformed callback', async () => {
    await callback('not valid!').expect(400);
    await t
      .http()
      .get('/payment/callback')
      .query({ Authority: 'MOCK-1', Status: 'PAID' })
      .expect(400);
  });

  it('settles only the attempt the customer came back from', async () => {
    const { headers, orderId } = await placeOrder('retry@example.test');
    await initiate(headers, orderId);
    const second = await initiate(headers, orderId);

    await callback(second).expect(302);

    const payments = await paymentsOf(orderId);
    expect(payments.map((p) => p.status)).toEqual(['pending', 'paid']);
  });

  // The old endpoint believed a status sent by the browser.
  it('no longer offers client-reported verification', async () => {
    const { headers, orderId } = await placeOrder('old-verify@example.test');
    await initiate(headers, orderId);

    await t
      .http()
      .get('/payment/verify')
      .query({ orderId, status: 'success' })
      .set(headers)
      .expect(404);
    expect(await orderStatus(orderId)).toBe('pending');
  });
});
