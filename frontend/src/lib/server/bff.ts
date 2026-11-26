// frontend/src/lib/server/bff.ts
//
// Server side of the storefront's backend-for-frontend (the /api route
// handlers). The browser never sees the Nest login token: it lives in an
// httpOnly cookie that only this server reads, and requests to Nest are
// made from here with the token attached.
//
// Only route handlers import this module.

import { randomUUID } from 'crypto';
import { isIP } from 'net';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../csrf';
import { sessionCookieFor, type SessionCookie } from '../session-cookie';

const UPSTREAM_TIMEOUT_MS = 10_000;

const serverEnvSchema = z.object({
  // Where this server reaches the Nest API and Payload (inside a container
  // network these are internal addresses, not public ones).
  NEST_INTERNAL_URL: z.string().url().default('http://localhost:3001'),
  PAYLOAD_INTERNAL_URL: z.string().url().default('http://localhost:3000/api'),
  // The storefront's public address: the only origin allowed to call the
  // BFF, and whether the session cookie must be Secure.
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().default('http://localhost:3002'),
  // How many reverse proxies in front of the storefront add the client's
  // address to X-Forwarded-For (see clientAddress). 0: browsers reach it
  // directly.
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  // Shared with the CMS, which creates accounts only for requests that
  // carry it (app/api/auth/register). Required in production
  // (startup-check.ts).
  REGISTRATION_SECRET: z.string().min(32).optional(),
});

export interface ServerEnv {
  nestUrl: string;
  payloadUrl: string;
  frontendOrigin: string;
  trustedProxyHops: number;
  registrationSecret: string | undefined;
}

// Read on every call (cheap), so tests and the runtime see current values.
export function serverEnv(): ServerEnv {
  const parsed = serverEnvSchema.parse({
    NEST_INTERNAL_URL: process.env.NEST_INTERNAL_URL || undefined,
    PAYLOAD_INTERNAL_URL: process.env.PAYLOAD_INTERNAL_URL || undefined,
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL || undefined,
    TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS || undefined,
    REGISTRATION_SECRET: process.env.REGISTRATION_SECRET || undefined,
  });
  return {
    nestUrl: parsed.NEST_INTERNAL_URL.replace(/\/+$/, ''),
    payloadUrl: parsed.PAYLOAD_INTERNAL_URL.replace(/\/+$/, ''),
    frontendOrigin: new URL(parsed.NEXT_PUBLIC_FRONTEND_URL).origin,
    trustedProxyHops: parsed.TRUSTED_PROXY_HOPS,
    registrationSecret: parsed.REGISTRATION_SECRET,
  };
}

// ---------------------------------------------------------------------------
// Session cookie
// ---------------------------------------------------------------------------

export function sessionCookie(env: ServerEnv = serverEnv()): SessionCookie {
  return sessionCookieFor(env.frontendOrigin);
}

// Seconds until the token expires, read from its exp claim (the signature
// is Nest's business). Null for anything that is not a live JWT.
export function tokenLifetimeSeconds(
  token: string,
  nowMs: number = Date.now(),
): number | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }
  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );
    const exp = (claims as { exp?: unknown } | null)?.exp;
    if (typeof exp !== 'number') {
      return null;
    }
    const seconds = Math.floor(exp - nowMs / 1000);
    return seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

export function readSession(request: NextRequest): string | null {
  return request.cookies.get(sessionCookie().name)?.value || null;
}

export function setSession(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number,
): void {
  const { name, secure } = sessionCookie();
  response.cookies.set({
    name,
    value: token,
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSession(response: NextResponse): void {
  const { name, secure } = sessionCookie();
  response.cookies.set({
    name,
    value: '',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

// The same shape as Nest's errors: a code the page words in its own
// language (apiErrors.* in the message files) and an English message for
// developers.
export function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json({ statusCode: status, code, message }, { status });
}

export function unavailableResponse(): NextResponse {
  return errorResponse(503, 'UNAVAILABLE', 'The shop service is unavailable.');
}

// ---------------------------------------------------------------------------
// Cross-site request protection
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Requests that change something must come from the storefront's own pages:
// the browser's Origin header must be ours, and the request must carry the
// custom CSRF header. Returns the refusal, or null when allowed.
export function rejectCrossSite(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) {
    return null;
  }
  const origin = request.headers.get('origin');
  if (
    origin !== serverEnv().frontendOrigin ||
    request.headers.get(CSRF_HEADER) !== CSRF_HEADER_VALUE
  ) {
    return errorResponse(403, 'FORBIDDEN', 'Cross-site request refused.');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calling Nest and Payload
// ---------------------------------------------------------------------------

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

// The customer's address, for Nest's per-client rate limits.
//
// Each trusted proxy in front of the storefront appends the address it was
// reached from to X-Forwarded-For; whatever comes before those entries was
// written by the client and could be anything. So the client is the entry
// `hops` places from the end: the address the outermost trusted proxy saw.
//
// With no proxy (hops 0) there is no trustworthy entry. Next.js fills the
// header with the connecting address only when the request has none, so a
// client could name any address; nothing is passed on, and Nest counts
// those requests against the storefront itself.
export function clientAddress(
  forwardedFor: string | null,
  hops: number,
): string | null {
  if (!forwardedFor || hops < 1) {
    return null;
  }
  const entries = forwardedFor
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const address = entries[entries.length - hops];
  return address && isIP(address) ? address : null;
}

// What upstream services learn about the caller: the client's address (see
// clientAddress; Nest trusts it from the storefront, its TRUST_PROXY), and
// a request id shared by both log lines.
export function forwardedHeaders(request: NextRequest): Record<string, string> {
  const incomingId = request.headers.get('x-request-id');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-Id':
      incomingId && SAFE_REQUEST_ID.test(incomingId)
        ? incomingId
        : randomUUID(),
  };
  const client = clientAddress(
    request.headers.get('x-forwarded-for'),
    serverEnv().trustedProxyHops,
  );
  if (client) {
    headers['X-Forwarded-For'] = client;
  }
  return headers;
}

export interface UpstreamResponse {
  status: number;
  headers: Headers;
  text: string;
  json: unknown;
}

// One request to Nest or Payload with a timeout. Null when the service
// could not be reached.
export async function callUpstream(
  url: string,
  init: RequestInit,
): Promise<UpstreamResponse | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    return { status: response.status, headers: response.headers, text, json };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Upstream request to ${new URL(url).pathname} failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return null;
  }
}

// Passes an upstream answer on unchanged (status, JSON body, request id),
// never its cookies.
export function relay(upstream: UpstreamResponse): NextResponse {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }
  const requestId = upstream.headers.get('x-request-id');
  if (requestId) {
    headers.set('X-Request-Id', requestId);
  }
  const body = upstream.status === 204 ? null : upstream.text;
  return new NextResponse(body, { status: upstream.status, headers });
}
