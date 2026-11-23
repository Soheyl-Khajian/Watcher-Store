import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

// The admin Orders view's forms post here; the endpoint forwards to Nest.
describe('POST /api/order-actions/:id/:action', () => {
  let t: TestPayload;
  let admin: { id: number; token: string };
  let customer: { id: number; token: string };

  beforeAll(async () => {
    process.env.NEST_INTERNAL_URL = 'http://nest.test';
    t = await createTestPayload();
    admin = await t.createUser('orders-admin@example.test', 'admin');
    customer = await t.createUser('orders-customer@example.test', 'customer');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await t?.close();
  });

  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  };

  const nest = (status: number) => {
    const fetchMock = vi.fn(async () => new Response('{}', { status }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('ships an order and sends the browser back to the Orders view', async () => {
    const fetchMock = nest(200);

    const res = await t.api('POST', '/order-actions/12/ship', {
      token: admin.token,
      form: form({ trackingCode: ' TRK-99 ', page: '2' }),
    });

    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(
      '/admin/orders?page=2&order=12&action=ship&result=done',
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(String(url)).toBe('http://nest.test/admin/orders/12/ship');
    expect(JSON.parse(String(init.body))).toEqual({ trackingCode: 'TRK-99' });
  });

  it('reports a change the order’s status does not allow', async () => {
    nest(409);
    const res = await t.api('POST', '/order-actions/12/complete', {
      token: admin.token,
      form: form({}),
    });
    expect(res.headers.get('location')).toContain('result=conflict');
  });

  it('refuses customers and visitors without calling Nest', async () => {
    const fetchMock = nest(200);
    expect(
      (
        await t.api('POST', '/order-actions/12/cancel', {
          token: customer.token,
          form: form({}),
        })
      ).status,
    ).toBe(403);
    expect(
      (await t.api('POST', '/order-actions/12/cancel', { form: form({}) }))
        .status,
    ).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['/order-actions/abc/ship', '/order-actions/12/delete'])(
    'refuses %s',
    async (path) => {
      const fetchMock = nest(200);
      const res = await t.api('POST', path, {
        token: admin.token,
        form: form({}),
      });
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
