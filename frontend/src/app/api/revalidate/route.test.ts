import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag }));

const { POST } = await import('./route');

const SECRET = 'x'.repeat(48);

const call = (body: unknown, secret: string | null = SECRET) =>
  POST(
    new NextRequest('https://shop.example.test/api/revalidate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(secret === null ? {} : { authorization: `Bearer ${secret}` }),
      },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    process.env.REVALIDATE_SECRET = SECRET;
    revalidateTag.mockClear();
  });

  afterEach(() => {
    delete process.env.REVALIDATE_SECRET;
  });

  it('drops the cache for the given tags', async () => {
    const response = await call({
      tags: ['products', 'categories', 'products'],
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      revalidated: ['products', 'categories'],
    });
    expect(revalidateTag.mock.calls).toEqual([['products'], ['categories']]);
  });

  it.each([
    ['no secret', null],
    ['a wrong secret', 'y'.repeat(48)],
    ['a secret of another length', 'short'],
  ])('refuses %s', async (_name, secret) => {
    const response = await call({ tags: ['products'] }, secret);
    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ tags: [] }],
    [{ tags: ['users'] }],
    [{ tags: 'products' }],
  ])('refuses %p', async (body) => {
    expect((await call(body)).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not exist without a configured secret', async () => {
    delete process.env.REVALIDATE_SECRET;
    expect((await call({ tags: ['products'] }, '')).status).toBe(404);
  });
});
