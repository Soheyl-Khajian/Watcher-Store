import { createTestApp, TestApp } from './e2e/harness';

// Without a configured gateway (the default) nothing pretends to take money.
// Its own file: the harness configures one app per test file.
describe('Payments without a gateway (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ PAYMENT_GATEWAY: 'none' });
  });

  afterAll(async () => {
    await t?.close();
  });

  it('answers 503 instead of pretending to take money', async () => {
    const headers = {
      Authorization: `Bearer ${await t.login(
        await t.createUser({ email: 'no-gateway@example.test' }),
      )}`,
    };

    const response = await t
      .http()
      .post('/payment/initiate')
      .set(headers)
      .send({ orderId: 1 })
      .expect(503);
    expect(response.body.code).toBe('PAYMENT_UNAVAILABLE');
  });
});
