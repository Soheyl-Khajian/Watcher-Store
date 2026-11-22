// frontend/src/app/uploads/[filename]/route.ts
//
// Media files at the storefront's own address (lib/utils/media.ts): fetched
// from Payload's internal address, wherever Payload stores them. Only
// images are passed on; browsers and the image optimizer may cache them.

import { serverEnv } from '@/lib/server/bff';

export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 10_000;

// What Payload's Media collection accepts.
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

// Cached for an hour, then revalidated with the ETag (a changed image under
// the same name shows up within the hour).
const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

const PASSED_ON = ['content-type', 'content-length', 'etag', 'last-modified'];
const CONDITIONAL = ['if-none-match', 'if-modified-since'];

function notFound(): Response {
  return new Response('Not found', {
    status: 404,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isPlainFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= 255 &&
    !/[/\\]/.test(name) &&
    name !== '.' &&
    name !== '..' &&
    !hasControlCharacter(name)
  );
}

function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await params;
  if (!isPlainFileName(filename)) {
    return notFound();
  }

  const headers = new Headers();
  for (const name of CONDITIONAL) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${serverEnv().payloadUrl}/media/file/${encodeURIComponent(filename)}`,
      {
        headers,
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
  } catch {
    return new Response('Media unavailable', {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const responseHeaders = new Headers({
    'Cache-Control': CACHE_CONTROL,
    // An image is never a document that runs anything.
    'Content-Security-Policy': "default-src 'none'",
  });
  for (const name of PASSED_ON) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  if (upstream.status === 304) {
    responseHeaders.delete('content-length');
    return new Response(null, { status: 304, headers: responseHeaders });
  }

  const type = upstream.headers.get('content-type')?.split(';')[0].trim();
  if (upstream.status !== 200 || !type || !IMAGE_TYPES.has(type)) {
    await upstream.body?.cancel();
    return upstream.status >= 500
      ? new Response('Media unavailable', {
          status: 502,
          headers: { 'Cache-Control': 'no-store' },
        })
      : notFound();
  }

  return new Response(upstream.body, { status: 200, headers: responseHeaders });
}
