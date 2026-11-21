import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { fetchNestOrders as FetchNestOrders } from '../src/utils/nestOrders';

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
