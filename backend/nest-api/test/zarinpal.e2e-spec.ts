import { randomUUID } from 'crypto';
import type { PaymentService } from '../src/payment/payment.service';
import { createTestApp, TestApp } from './e2e/harness';
import { CARD_PAN, startZarinpalStub, ZarinpalStub } from './e2e/zarinpal-stub';

const MERCHANT_ID = randomUUID();
const CALLBACK_URL = 'https://shop.example.test/api/payment/callback';
const RESULT_PAGE = 'http://localhost:3002/payment/verify';

const shipping = {
  recipientName: 'Test Customer',
  phone: '09123456789',
  province: 'Tehran',
  city: 'Tehran',
  address: 'Test street 1',
  postalCode: '1234567890',
};

// Paying through Zarinpal (a fake with the same API): the payment is
// registered with the gateway, the customer pays on Zarinpal's page, and
// the callback verifies it with Zarinpal, server to server, before the
// order counts as paid.
describe('Zarinpal payments (e2e)', () => {
  let zarinpal: ZarinpalStub;
  let t: TestApp;
  let paymentService: PaymentService;

  beforeAll(async () => {
    zarinpal = await startZarinpalStub(MERCHANT_ID);
    t = await createTestApp({
      PAYMENT_GATEWAY: 'zarinpal',
      ZARINPAL_MERCHANT_ID: MERCHANT_ID,
      ZARINPAL_BASE_URL: zarinpal.url,
      PAYMENT_CALLBACK_URL: CALLBACK_URL,
      PAYMENT_TIMEOUT_MS: '500',
    });
    // Loaded after the harness has configured the environment.
    const { PaymentService } = await import('../src/payment/payment.service');
    paymentService = t.app.get(PaymentService);
  });

  afterEach(() => {
    zarinpal.mode = 'normal';
  });

  afterAll(async () => {
    await t?.close();
    await zarinpal?.close();
  });

  async function placeOrder(email: string) {
    const headers = {
      Authorization: `Bearer ${await t.login(await t.createUser({ email }))}`,
    };
    const productId = await t.createProduct({ price: 250_000, stock: 10 });
    await t
      .http()
      .post('/cart')
      .set(headers)
      .send({ productId, quantity: 2 })
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

  // Starts a payment and returns its Zarinpal authority.
  async function start(
    headers: Record<string, string>,
    orderId: number,
  ): Promise<string> {
    const response = await initiate(headers, orderId).expect(201);
    const match = /\/pg\/StartPay\/(\w+)$/.exec(response.body.paymentUrl);
    return (match as RegExpExecArray)[1];
  }

  const callback = (Authority: string, Status: 'OK' | 'NOK' = 'OK') =>
    t.http().get('/payment/callback').query({ Authority, Status });

  async function paymentOf(orderId: number) {
    const { rows } = await t.db.query(
      'SELECT * FROM nest_schema.payment WHERE "orderId" = $1 ORDER BY id DESC LIMIT 1',
      [orderId],
    );
    return rows[0];
  }

  async function orderStatus(orderId: number): Promise<string> {
    const { rows } = await t.db.query(
      'SELECT status FROM nest_schema."order" WHERE id = $1',
      [orderId],
    );
    return rows[0].status;
  }

  const verifyCalls = (authority: string) =>
    zarinpal.requests.filter(
      (r) =>
        r.path === '/pg/v4/payment/verify.json' &&
        r.body.authority === authority,
    ).length;

  describe('starting a payment', () => {
    it('registers the order total in rial and sends the customer to StartPay', async () => {
      const { headers, orderId, total } = await placeOrder(
        'zp-start@example.test',
      );

      const response = await initiate(headers, orderId).expect(201);

      const request = zarinpal.requests[zarinpal.requests.length - 1];
      expect(request).toMatchObject({
        path: '/pg/v4/payment/request.json',
        body: {
          merchant_id: MERCHANT_ID,
          amount: total * 10,
          currency: 'IRR',
          callback_url: CALLBACK_URL,
          metadata: { order_id: String(orderId) },
        },
      });

      const payment = await paymentOf(orderId);
      expect(payment).toMatchObject({
        gateway: 'zarinpal',
        status: 'pending',
        amountRial: String(total * 10),
      });
      expect(response.body.paymentUrl).toBe(
        `${zarinpal.url}/pg/StartPay/${payment.authority}`,
      );
    });

    it.each(['error', 'hang-up'] as const)(
      'answers 503 and records nothing when Zarinpal is %s',
      async (mode) => {
        const { headers, orderId } = await placeOrder(
          `zp-down-${mode}@example.test`,
        );
        zarinpal.mode = mode;

        await initiate(headers, orderId).expect(503);

        expect(await paymentOf(orderId)).toBeUndefined();
        expect(await orderStatus(orderId)).toBe('pending');
      },
    );

    it('answers 502 when Zarinpal sends something that is not JSON', async () => {
      const { headers, orderId } = await placeOrder('zp-garbage@example.test');
      zarinpal.mode = 'garbage';

      await initiate(headers, orderId).expect(502);
      expect(await paymentOf(orderId)).toBeUndefined();
    });
  });

  describe('coming back from Zarinpal', () => {
    it('verifies the payment server to server and marks the order paid', async () => {
      const { headers, orderId, total } = await placeOrder(
        'zp-paid@example.test',
      );
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);

      const response = await callback(authority).expect(302);

      expect(response.headers.location).toBe(
        `${RESULT_PAGE}?orderId=${orderId}`,
      );
      expect(zarinpal.requests[zarinpal.requests.length - 1]).toMatchObject({
        path: '/pg/v4/payment/verify.json',
        body: { merchant_id: MERCHANT_ID, amount: total * 10, authority },
      });
      const payment = await paymentOf(orderId);
      expect(payment).toMatchObject({
        status: 'paid',
        refId: expect.stringMatching(/^\d+$/),
        cardPan: CARD_PAN,
      });
      expect(payment.gatewayResponse).toMatchObject({ data: { code: 100 } });
      expect(await orderStatus(orderId)).toBe('processing');
    });

    // Status=OK in the URL proves nothing; only Zarinpal's answer counts.
    it('does not believe Status=OK when the customer did not pay', async () => {
      const { headers, orderId, productId } = await placeOrder(
        'zp-unpaid@example.test',
      );
      const authority = await start(headers, orderId);

      await callback(authority, 'OK').expect(302);

      expect((await paymentOf(orderId)).status).toBe('failed');
      expect(await orderStatus(orderId)).toBe('cancelled');
      const { rows } = await t.db.query(
        'SELECT stock FROM payload_schema.products WHERE id = $1',
        [productId],
      );
      expect(Number(rows[0].stock)).toBe(10);
    });

    it('cancels without asking Zarinpal when the customer cancelled (NOK)', async () => {
      const { headers, orderId } = await placeOrder('zp-nok@example.test');
      const authority = await start(headers, orderId);

      await callback(authority, 'NOK').expect(302);

      expect(verifyCalls(authority)).toBe(0);
      expect((await paymentOf(orderId)).status).toBe('failed');
      expect(await orderStatus(orderId)).toBe('cancelled');
    });

    it('refuses a payment of a different amount', async () => {
      const { headers, orderId, total } = await placeOrder(
        'zp-amount@example.test',
      );
      const authority = await start(headers, orderId);
      zarinpal.pay(authority, total * 10 - 10_000);

      await callback(authority).expect(302);

      expect((await paymentOf(orderId)).status).toBe('failed');
      expect(await orderStatus(orderId)).not.toBe('processing');
    });

    it('ignores a replayed callback', async () => {
      const { headers, orderId } = await placeOrder('zp-replay@example.test');
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);
      await callback(authority).expect(302);
      const before = await paymentOf(orderId);

      const replay = await callback(authority).expect(302);

      expect(replay.headers.location).toBe(`${RESULT_PAGE}?orderId=${orderId}`);
      expect(verifyCalls(authority)).toBe(1);
      expect(await paymentOf(orderId)).toEqual(before);
    });

    // A second verification is answered 101 ("already verified").
    it('treats code 101 as paid', async () => {
      const { headers, orderId } = await placeOrder('zp-101@example.test');
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);
      await Promise.all([callback(authority), callback(authority)]);

      expect((await paymentOf(orderId)).status).toBe('paid');
      expect(await orderStatus(orderId)).toBe('processing');
    });

    it.each(['error', 'hang-up', 'garbage'] as const)(
      'keeps the payment pending when Zarinpal is %s, and settles it later',
      async (mode) => {
        const { headers, orderId } = await placeOrder(
          `zp-later-${mode}@example.test`,
        );
        const authority = await start(headers, orderId);
        zarinpal.pay(authority);
        zarinpal.mode = mode;

        const response = await callback(authority).expect(302);

        // The customer still sees their order, as awaiting confirmation.
        expect(response.headers.location).toBe(
          `${RESULT_PAGE}?orderId=${orderId}`,
        );
        expect((await paymentOf(orderId)).status).toBe('pending');
        expect(await orderStatus(orderId)).toBe('pending');

        zarinpal.mode = 'normal';
        await callback(authority).expect(302);
        expect((await paymentOf(orderId)).status).toBe('paid');
      },
    );

    it('sends an unknown authority to the result page without an order', async () => {
      const response = await callback(`A${'9'.repeat(35)}`).expect(302);
      expect(response.headers.location).toBe(RESULT_PAGE);
    });
  });

  // The customer paid and closed the browser: the callback never came.
  describe('reconciling payments the customer never came back from', () => {
    const backdate = (orderId: number, minutes: number) =>
      t.db.query(
        `UPDATE nest_schema.payment SET "createdAt" = now() - make_interval(mins => $2)
         WHERE "orderId" = $1`,
        [orderId, minutes],
      );

    const reconcile = () => paymentService.reconcilePendingPayments();

    it('settles a payment Zarinpal confirms', async () => {
      const { headers, orderId } = await placeOrder('zp-closed@example.test');
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);
      await backdate(orderId, 20);

      await reconcile();

      expect(verifyCalls(authority)).toBe(1);
      expect(await paymentOf(orderId)).toMatchObject({
        status: 'paid',
        cardPan: CARD_PAN,
      });
      expect(await orderStatus(orderId)).toBe('processing');
    });

    it('fails a payment Zarinpal never received, keeping the order', async () => {
      const { headers, orderId } = await placeOrder('zp-gave-up@example.test');
      await start(headers, orderId);
      await backdate(orderId, 20);

      await reconcile();

      expect((await paymentOf(orderId)).status).toBe('failed');
      expect(await orderStatus(orderId)).toBe('pending');
    });

    it('does not ask about payments still in progress', async () => {
      const { headers, orderId } = await placeOrder(
        'zp-in-progress@example.test',
      );
      const authority = await start(headers, orderId);
      await backdate(orderId, 5);

      await reconcile();

      expect(verifyCalls(authority)).toBe(0);
      expect((await paymentOf(orderId)).status).toBe('pending');
    });

    it('does not ask about payments older than a week', async () => {
      const { headers, orderId } = await placeOrder('zp-ancient@example.test');
      const authority = await start(headers, orderId);
      await backdate(orderId, 8 * 24 * 60);

      await reconcile();

      expect(verifyCalls(authority)).toBe(0);
    });

    it('keeps the payment pending when Zarinpal is down, and tries again', async () => {
      const { headers, orderId } = await placeOrder(
        'zp-recon-down@example.test',
      );
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);
      await backdate(orderId, 20);
      zarinpal.mode = 'hang-up';

      await expect(reconcile()).resolves.toBeGreaterThanOrEqual(0);
      expect((await paymentOf(orderId)).status).toBe('pending');

      zarinpal.mode = 'normal';
      await reconcile();
      expect((await paymentOf(orderId)).status).toBe('paid');
    });

    it('flags a refund when the order expired before Zarinpal confirmed', async () => {
      const { headers, orderId, productId } = await placeOrder(
        'zp-expired@example.test',
      );
      const authority = await start(headers, orderId);
      zarinpal.pay(authority);
      await backdate(orderId, 20);
      await t.db.query(
        `UPDATE nest_schema."order" SET "createdAt" = now() - interval '25 hours' WHERE id = $1`,
        [orderId],
      );
      const { OrdersService } = await import('../src/orders/orders.service');
      await t.app.get(OrdersService).expireStalePendingOrders(24);

      await reconcile();

      expect((await paymentOf(orderId)).status).toBe('paid');
      const { rows } = await t.db.query(
        'SELECT status, "refundStatus" FROM nest_schema."order" WHERE id = $1',
        [orderId],
      );
      expect(rows[0]).toEqual({
        status: 'cancelled',
        refundStatus: 'required',
      });
      const stock = await t.db.query(
        'SELECT stock FROM payload_schema.products WHERE id = $1',
        [productId],
      );
      expect(Number(stock.rows[0].stock)).toBe(10);
    });
  });
});
