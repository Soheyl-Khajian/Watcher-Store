// frontend/src/app/api/auth/me/route.ts
//
// GET /api/auth/me -> { user } for the session, or 401 (and the cookie is
// cleared when Nest no longer accepts it, e.g. after it expired).

import { NextResponse, type NextRequest } from 'next/server';
import {
  callUpstream,
  clearSession,
  errorResponse,
  forwardedHeaders,
  readSession,
  serverEnv,
  UNAVAILABLE_MESSAGE,
} from '@/lib/server/bff';

const SIGNED_OUT_MESSAGE = 'برای ادامه وارد حساب کاربری خود شوید.';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = readSession(request);
  if (!token) {
    return errorResponse(401, SIGNED_OUT_MESSAGE);
  }

  const profile = await callUpstream(`${serverEnv().nestUrl}/auth/profile`, {
    headers: { ...forwardedHeaders(request), Authorization: `Bearer ${token}` },
  });
  if (!profile) {
    return errorResponse(503, UNAVAILABLE_MESSAGE);
  }
  if (profile.status === 401) {
    const response = errorResponse(401, SIGNED_OUT_MESSAGE);
    clearSession(response);
    return response;
  }
  if (profile.status !== 200) {
    return errorResponse(503, UNAVAILABLE_MESSAGE);
  }

  return NextResponse.json({ user: profile.json });
}
