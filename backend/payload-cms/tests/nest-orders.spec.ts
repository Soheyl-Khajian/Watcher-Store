import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type {
  fetchNestOrders as FetchNestOrders,
  performOrderAction as PerformOrderAction,
} from '../src/utils/nestOrders';

const order = {
  id: 7,
  userId: 3,
  total: 250_000,
  status: 'cancelled',
  createdAt: '2026-11-22T10:00:00.000Z',
  items: [{ id: 1, productId: '4', quantity: 1, price: 250_000 }],
  shipping: null,
  // Never shown in the admin: stripped by the schema.
  internalNote: 'secret',
};

function pageOf(items: unknown[]) {
  return { items, page: 1, limit: 25, totalItems: items.length, totalPages: 1 };
}

// The admin Orders view reads Nest's admin orders API.
describe('fetchNestOrders', () => {
  let fetchNestOrders: typeof FetchNestOrders;
  const logger = { error: vi.fn() };

  beforeAll(async () => {
    Object.assign(process.env, {
      PAYLOAD_SECRET: 'x'.repeat(64),
      DATABASE_URI: 'postgres://postgres:postgres@localhost:5432/watcher_store',
      FRONTEND_URL: 'http://localhost:3002',
      NEST_INTERNAL_URL: 'http://nest.test',
    });
    ({ fetchNestOrders } = await import('../src/utils/nestOrders'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const respondWith = (body: unknown) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })),
    );

  it('passes the refund status through', async () => {
    respondWith(pageOf([{ ...order, refundStatus: 'required' }]));

    const result = await fetchNestOrders({ token: 't', page: 1, logger });

    expect(result.ok).toBe(true);
    const [first] = result.ok ? result.data.items : [];
    expect(first.refundStatus).toBe('required');
    expect(first).not.toHaveProperty('internalNote');
  });

  it('treats a missing or unknown refund status as none', async () => {
    respondWith(
      pageOf([
        { ...order, id: 1 },
        { ...order, id: 2, refundStatus: 'something-new' },
      ]),
    );

    const result = await fetchNestOrders({ token: 't', page: 1, logger });

    expect(result.ok && result.data.items.map((o) => o.refundStatus)).toEqual([
      'none',
      'none',
    ]);
  });
});

// The admin Orders view's buttons (via the order-actions endpoint).
describe('performOrderAction', () => {
  let performOrderAction: typeof PerformOrderAction;
  const logger = { error: vi.fn() };

  beforeAll(async () => {
    ({ performOrderAction } = await import('../src/utils/nestOrders'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const nestAnswers = (status: number) => {
    const fetchMock = vi.fn(async () => new Response('{}', { status }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('posts the action to Nest as the administrator', async () => {
    const fetchMock = nestAnswers(200);

    const outcome = await performOrderAction({
      token: 'admin-token',
      orderId: 7,
      action: 'ship',
      trackingCode: 'TRK-1',
      logger,
    });

    expect(outcome).toBe('done');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(String(url)).toBe('http://nest.test/admin/orders/7/ship');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('authorization')).toBe(
      'JWT admin-token',
    );
    expect(JSON.parse(String(init.body))).toEqual({ trackingCode: 'TRK-1' });
  });

  it('sends no tracking code with other actions', async () => {
    const fetchMock = nestAnswers(200);
    await performOrderAction({
      token: 't',
      orderId: 7,
      action: 'complete',
      trackingCode: 'ignored',
      logger,
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({});
  });

  it.each([
    [400, 'invalid'],
    [401, 'forbidden'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [500, 'unavailable'],
  ] as const)('maps HTTP %i to %s', async (status, expected) => {
    nestAnswers(status);
    expect(
      await performOrderAction({
        token: 't',
        orderId: 1,
        action: 'cancel',
        logger,
      }),
    ).toBe(expected);
  });

  it('reports Nest being unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    expect(
      await performOrderAction({
        token: 't',
        orderId: 1,
        action: 'cancel',
        logger,
      }),
    ).toBe('unavailable');
  });
});
