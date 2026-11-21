import { MockGateway } from './mock.gateway';

describe('MockGateway', () => {
  const gateway = new MockGateway();

  it('sends the customer straight back to the callback URL', async () => {
    const started = await gateway.start({
      orderId: 7,
      amountRial: 1_000_000,
      description: 'test',
      callbackUrl: 'http://shop.test/payment/verify?orderId=7',
    });

    const url = new URL(started.redirectUrl);
    expect(url.searchParams.get('orderId')).toBe('7');
    expect(url.searchParams.get('Authority')).toBe(started.authority);
    expect(url.searchParams.get('Status')).toBe('OK');
  });

  it('gives every payment its own authority', async () => {
    const input = {
      orderId: 7,
      amountRial: 1_000_000,
      description: 'test',
      callbackUrl: 'http://shop.test/cb',
    };
    const [a, b] = await Promise.all([
      gateway.start(input),
      gateway.start(input),
    ]);
    expect(a.authority).not.toBe(b.authority);
  });

  it('reports OK as paid and NOK as not paid', async () => {
    const input = { authority: 'MOCK-abc', amountRial: 1_000_000 };

    await expect(
      gateway.verify({ ...input, callbackStatus: 'OK' }),
    ).resolves.toMatchObject({ paid: true, refId: expect.any(String) });
    await expect(
      gateway.verify({ ...input, callbackStatus: 'NOK' }),
    ).resolves.toMatchObject({ paid: false });
  });
});
