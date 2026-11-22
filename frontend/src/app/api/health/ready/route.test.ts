import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { READY_CHECK_TIMEOUT_MS } from '@/lib/server/readiness';
import { GET } from './route';

const PAYLOAD = 'http://payload.internal:3000/api';
const NEST = 'http://nest.internal:3001';

type Answer = number | 'refused' | 'hang';

function backends(answers: { payload: Answer; nest: Answer }) {
  const fetchMock = vi.fn(
    (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const answer = url.startsWith(PAYLOAD) ? answers.payload : answers.nest;
      if (answer === 'refused') {
        return Promise.reject(new TypeError('fetch failed'));
      }
      if (answer === 'hang') {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('timed out', 'TimeoutError')),
          );
        });
      }
      return Promise.resolve(new Response('{}', { status: answer }));
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    process.env.PAYLOAD_INTERNAL_URL = PAYLOAD;
    process.env.NEST_INTERNAL_URL = NEST;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYLOAD_INTERNAL_URL;
    delete process.env.NEST_INTERNAL_URL;
  });

  it('is ready when Payload and Nest both answer', async () => {
    const fetchMock = backends({ payload: 200, nest: 200 });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      status: 'ok',
      checks: { payload: 'up', nest: 'up' },
    });
    expect(fetchMock.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      `${NEST}/health`,
      `${PAYLOAD}/users/me`,
    ]);
  });

  it('counts a Payload client error as up (it answered)', async () => {
    backends({ payload: 401, nest: 200 });
    expect((await GET()).status).toBe(200);
  });

  it.each<[string, { payload: Answer; nest: Answer }, object]>([
    [
      'Payload is down',
      { payload: 'refused', nest: 200 },
      { payload: 'down', nest: 'up' },
    ],
    [
      'Payload errors',
      { payload: 502, nest: 200 },
      { payload: 'down', nest: 'up' },
    ],
    [
      'Nest is down',
      { payload: 200, nest: 'refused' },
      { payload: 'up', nest: 'down' },
    ],
    [
      'Nest is unhealthy',
      { payload: 200, nest: 503 },
      { payload: 'up', nest: 'down' },
    ],
  ])('is unavailable when %s', async (_, answers, checks) => {
    backends(answers);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable', checks });
  });

  // AbortSignal.timeout runs on Node's own clock (fake timers cannot move
  // it), so this waits the real timeout.
  it('gives up on a backend that does not answer in time', async () => {
    backends({ payload: 200, nest: 'hang' });

    const started = Date.now();
    const response = await GET();

    expect(Date.now() - started).toBeGreaterThanOrEqual(
      READY_CHECK_TIMEOUT_MS - 50,
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: 'unavailable',
      checks: { payload: 'up', nest: 'down' },
    });
  });
});
