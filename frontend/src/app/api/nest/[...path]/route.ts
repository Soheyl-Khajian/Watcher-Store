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
  const upstream = await callUpstream(
    `${serverEnv().nestUrl}/${joined}${request.nextUrl.search}`,
    {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
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
