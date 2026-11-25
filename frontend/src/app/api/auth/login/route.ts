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
  unavailableResponse,
} from '@/lib/server/bff';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = rejectCrossSite(request);
  if (refused) {
    return refused;
  }

  let credentials: { email: string; password: string };
  try {
    const body = (await request.json()) as Record<string, unknown> | null;
    if (typeof body?.email !== 'string' || typeof body.password !== 'string') {
      return errorResponse(
        400,
        'CREDENTIALS_REQUIRED',
        'Send an email and a password.',
      );
    }
    credentials = { email: body.email, password: body.password };
  } catch {
    return errorResponse(
      400,
      'CREDENTIALS_REQUIRED',
      'Send an email and a password.',
    );
  }

  const { nestUrl } = serverEnv();
  const headers = forwardedHeaders(request);

  const login = await callUpstream(`${nestUrl}/auth/login`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!login) {
    return unavailableResponse();
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
    return unavailableResponse();
  }

  const response = NextResponse.json({ user: profile.json });
  setSession(response, token as string, lifetime);
  return response;
}
