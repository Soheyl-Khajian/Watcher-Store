import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const PAYLOAD = 'http://payload.internal:3000/api';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function payloadAnswers(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const get = (filename: string, headers: HeadersInit = {}) =>
  GET(new Request(`https://shop.example.test/uploads/x`, { headers }), {
    params: Promise.resolve({ filename }),
  });

describe('GET /uploads/[filename]', () => {
  beforeEach(() => {
    process.env.PAYLOAD_INTERNAL_URL = PAYLOAD;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PAYLOAD_INTERNAL_URL;
  });

  it('serves the image from Payload, cacheable', async () => {
    const fetchMock = payloadAnswers(
      new Response(PNG, {
        headers: {
          'content-type': 'image/png',
          'content-length': '4',
          etag: '"abc"',
          'set-cookie': 'payload-token=x',
        },
      }),
    );

    const response = await get('camera 1.png');

    expect(fetchMock).toHaveBeenCalledWith(
      `${PAYLOAD}/media/file/camera%201.png`,
      expect.anything(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('etag')).toBe('"abc"');
    expect(response.headers.get('cache-control')).toMatch(/^public/);
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'",
    );
    // Nothing else of Payload's response is passed on.
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
  });

  it('passes revalidation through (304)', async () => {
    const fetchMock = payloadAnswers(
      new Response(null, { status: 304, headers: { etag: '"abc"' } }),
    );

    const response = await get('camera.png', { 'if-none-match': '"abc"' });

    const init = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(init[1].headers).get('if-none-match')).toBe('"abc"');
    expect(response.status).toBe(304);
  });

  it.each(['text/html', 'image/svg+xml', 'application/json'])(
    'refuses to pass on %s',
    async (type) => {
      payloadAnswers(
        new Response('<x/>', { headers: { 'content-type': type } }),
      );
      expect((await get('camera.png')).status).toBe(404);
    },
  );

  it('answers 404 for a file Payload does not have', async () => {
    payloadAnswers(new Response('{}', { status: 404 }));
    const response = await get('missing.png');
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each([
    [new Response('', { status: 500 })],
    [new TypeError('fetch failed')],
  ])('answers 502 when Payload fails (%#)', async (answer) => {
    payloadAnswers(answer);
    expect((await get('camera.png')).status).toBe(502);
  });

  it.each(['../users', 'a/b.png', 'a\\b.png', '..', 'a\nb.png', ''])(
    'never asks Payload for %j',
    async (name) => {
      const fetchMock = payloadAnswers(new Response(PNG));
      expect((await get(name)).status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
