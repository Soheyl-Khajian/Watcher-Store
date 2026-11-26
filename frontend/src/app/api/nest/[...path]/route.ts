// frontend/src/app/api/nest/[...path]/route.ts
//
// /api/nest/<path> -> Nest /<path>, with the session token attached.
// Only the customer endpoints the storefront uses pass; everything else
// (admin routes, health, the token itself) answers 404.

import { NextResponse, type NextRequest } from 'next/server';
import {
  callUpstream,
  clearSession,
  errorResponse,
  forwardedHeaders,
  readSession,
  rejectCrossSite,
  relay,
  serverEnv,
  unavailableResponse,
} from '@/lib/server/bff';

const ID = '[A-Za-z0-9_-]{1,64}';

const ALLOWED: ReadonlyArray<readonly [string, RegExp]> = [
  ['GET', /^cart$/],
  ['POST', /^cart$/],
  ['PATCH', new RegExp(`^cart/${ID}$`)],
  ['DELETE', new RegExp(`^cart/${ID}$`)],
  ['GET', /^orders$/],
  ['POST', /^orders$/],
  ['GET', new RegExp(`^orders/${ID}$`)],
  ['POST', new RegExp(`^orders/${ID}/cancel$`)],
  ['POST', /^payment\/initiate$/],
];

// Request headers Nest needs besides the token.
const PASSED_HEADERS = ['content-type', 'idempotency-key'];

// The largest body the storefront sends (a checkout with shipping details
// is under 2 KB). Larger ones are refused before they are read into memory.
const MAX_BODY_BYTES = 64 * 1024;

// The body as text, or null when it is larger than MAX_BODY_BYTES (by its
// Content-Length, or while reading one sent without it).
async function readBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > MAX_BODY_BYTES) {
    return null;
  }
  if (!request.body) {
    return '';
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

type Context = { params: Promise<{ path: string[] }> };

async function proxy(
  request: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const refused = rejectCrossSite(request);
  if (refused) {
    return refused;
  }

  const { path } = await context.params;
  const joined = path.join('/');
  if (
    !ALLOWED.some(
      ([method, pattern]) => method === request.method && pattern.test(joined),
    )
  ) {
    return errorResponse(404, 'NOT_FOUND', 'No such API route.');
  }

  const token = readSession(request);
  if (!token) {
    return errorResponse(401, 'UNAUTHORIZED', 'Not logged in.');
  }

  const headers: Record<string, string> = {
    ...forwardedHeaders(request),
    Authorization: `Bearer ${token}`,
  };
  for (const name of PASSED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers[name] = value;
    }
  }

  const hasBody = request.method !== 'GET' && request.method !== 'DELETE';
  const body = hasBody ? await readBody(request) : undefined;
  if (body === null) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.');
  }
  const upstream = await callUpstream(
    `${serverEnv().nestUrl}/${joined}${request.nextUrl.search}`,
    {
      method: request.method,
      headers,
      body,
    },
  );
  if (!upstream) {
    return unavailableResponse();
  }

  const response = relay(upstream);
  // The token expired or was revoked: forget it.
  if (upstream.status === 401) {
    clearSession(response);
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
