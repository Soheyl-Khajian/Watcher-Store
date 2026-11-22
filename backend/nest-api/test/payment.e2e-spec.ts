import { randomUUID } from 'crypto';
import type { PaymentService } from '../src/payment/payment.service';
import { createTestApp, TestApp } from './e2e/harness';

const shipping = {
  recipientName: 'Test Customer',
  phone: '09123456789',
  province: 'Tehran',
  city: 'Tehran',
  address: 'Test street 1',
  postalCode: '1234567890',
};

const RESULT_PAGE = 'http://localhost:3002/payment/result';

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

  let paymentService: PaymentService;

  beforeAll(async () => {
    t = await createTestApp();
    // Loaded after the harness has configured the environment.
    const { PaymentService } = await import('../src/payment/payment.service');
    paymentService = t.app.get(PaymentService);
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

  async function refundStatus(orderId: number): Promise<string> {
    const { rows } = await t.db.query(
      'SELECT "refundStatus" FROM nest_schema."order" WHERE id = $1',
      [orderId],
    );
    return rows[0].refundStatus;
  }

  // Money that arrives for an order that can no longer take it is kept on
  // record as paid, and the order is flagged for a refund.
  describe('payments an order cannot take', () => {
    it('flags a refund when the customer cancelled while paying', async () => {
      const { headers, orderId, productId } = await placeOrder(
        'cancelled-while-paying@example.test',
      );
      const authority = await initiate(headers, orderId);
      await t.http().post(`/orders/${orderId}/cancel`).set(headers).expect(200);

      await callback(authority).expect(302);

      const [payment] = await paymentsOf(orderId);
      expect(payment.status).toBe('paid');
      expect(await orderStatus(orderId)).toBe('cancelled');
      expect(await refundStatus(orderId)).toBe('required');
      // Stock went back on cancellation and is not taken again.
      expect(await stockOf(productId)).toBe(10);
    });

    it('flags a refund when a second attempt is paid too', async () => {
      const { headers, orderId, productId } = await placeOrder(
        'paid-twice@example.test',
      );
      const first = await initiate(headers, orderId);
      const second = await initiate(headers, orderId);

      await callback(first).expect(302);
      await callback(second).expect(302);

      const payments = await paymentsOf(orderId);
      expect(payments.map((p) => p.status)).toEqual(['paid', 'paid']);
      expect(await orderStatus(orderId)).toBe('processing');
      expect(await refundStatus(orderId)).toBe('required');
      expect(await stockOf(productId)).toBe(7);
    });

    it('leaves a paid order alone when another attempt fails', async () => {
      const { headers, orderId } = await placeOrder(
        'paid-then-nok@example.test',
      );
      const first = await initiate(headers, orderId);
      const second = await initiate(headers, orderId);

      await callback(first).expect(302);
      await callback(second, 'NOK').expect(302);

      const payments = await paymentsOf(orderId);
      expect(payments.map((p) => p.status)).toEqual(['paid', 'failed']);
      expect(await orderStatus(orderId)).toBe('processing');
      expect(await refundStatus(orderId)).toBe('none');
    });

    // Orders placed before stock was reserved take it when paid.
    it('flags a refund when an old order sold out before payment', async () => {
      const { headers, orderId, productId } = await placeOrder(
        'legacy-sold-out@example.test',
        100_000,
        2,
      );
      await t.db.query(
        `UPDATE nest_schema."order" SET "stockReserved" = false WHERE id = $1`,
        [orderId],
      );
      await t.db.query(
        'UPDATE payload_schema.products SET stock = 1 WHERE id = $1',
        [productId],
      );
      const authority = await initiate(headers, orderId);

      await callback(authority).expect(302);

      expect((await paymentsOf(orderId))[0].status).toBe('paid');
      expect(await orderStatus(orderId)).toBe('pending');
      expect(await refundStatus(orderId)).toBe('required');
      expect(await stockOf(productId)).toBe(1);
    });
  });

  describe('reconciliation', () => {
    const reconcile = () => paymentService.reconcilePendingPayments();

    const backdate = (orderId: number, minutes: number) =>
      t.db.query(
        `UPDATE nest_schema.payment SET "createdAt" = now() - make_interval(mins => $2)
         WHERE "orderId" = $1`,
        [orderId, minutes],
      );

    // With the simulated gateway nobody paid unless they came back with OK.
    it('fails an abandoned payment but leaves the order to retry', async () => {
      const { headers, orderId } = await placeOrder('abandoned@example.test');
      await initiate(headers, orderId);
      await backdate(orderId, 20);

      expect(await reconcile()).toBeGreaterThanOrEqual(1);

      expect((await paymentsOf(orderId))[0].status).toBe('failed');
      expect(await orderStatus(orderId)).toBe('pending');
      // The customer can still pay.
      await t.payOrder(headers, orderId);
      expect(await orderStatus(orderId)).toBe('processing');
    });

    it('leaves recent payments alone', async () => {
      const { headers, orderId } = await placeOrder('recent@example.test');
      await initiate(headers, orderId);

      await reconcile();

      expect((await paymentsOf(orderId))[0].status).toBe('pending');
    });
  });
});
