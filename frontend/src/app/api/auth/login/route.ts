// frontend/src/app/api/auth/login/route.ts
//
// POST /api/auth/login { email, password } -> { user }
// Logs in through Nest and keeps the token in the httpOnly session cookie.

import { NextResponse, type NextRequest } from 'next/server';
import {
  callUpstream,
  errorResponse,
  forwardedHeaders,
  rejectCrossSite,
  relay,
  serverEnv,
  setSession,
  tokenLifetimeSeconds,
  UNAVAILABLE_MESSAGE,
} from '@/lib/server/bff';

const BAD_REQUEST_MESSAGE = 'ایمیل و رمز عبور را وارد کنید.';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = rejectCrossSite(request);
  if (refused) {
    return refused;
  }

  let credentials: { email: string; password: string };
  try {
    const body = (await request.json()) as Record<string, unknown> | null;
    if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
      return errorResponse(400, BAD_REQUEST_MESSAGE);
    }
    credentials = { email: body.email, password: body.password };
  } catch {
    return errorResponse(400, BAD_REQUEST_MESSAGE);
  }

  const { nestUrl } = serverEnv();
  const headers = forwardedHeaders(request);

  const login = await callUpstream(`${nestUrl}/auth/login`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!login) {
    return errorResponse(503, UNAVAILABLE_MESSAGE);
  }
  // Wrong password (401), too many attempts (429), Nest or Payload down
  // (503): Nest's own answer and Persian message.
  if (login.status !== 200) {
    return relay(login);
  }

  const token = (login.json as { access_token?: unknown } | undefined)
    ?.access_token;
  const lifetime =
    typeof token === 'string' ? tokenLifetimeSeconds(token) : null;
  const profile =
    typeof token === 'string' && lifetime !== null
      ? await callUpstream(`${nestUrl}/auth/profile`, {
          headers: { ...headers, Authorization: `Bearer ${token}` },
        })
      : null;

  if (!profile || profile.status !== 200 || lifetime === null) {
    return errorResponse(503, UNAVAILABLE_MESSAGE);
  }

  const response = NextResponse.json({ user: profile.json });
  setSession(response, token as string, lifetime);
  return response;
}
