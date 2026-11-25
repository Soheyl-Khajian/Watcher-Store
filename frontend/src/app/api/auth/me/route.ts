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
  unavailableResponse,
} from '@/lib/server/bff';

const signedOut = () => errorResponse(401, 'UNAUTHORIZED', 'Not logged in.');

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = readSession(request);
  if (!token) {
    return signedOut();
  }

  const profile = await callUpstream(`${serverEnv().nestUrl}/auth/profile`, {
    headers: { ...forwardedHeaders(request), Authorization: `Bearer ${token}` },
  });
  if (!profile) {
    return unavailableResponse();
  }
  if (profile.status === 401) {
    const response = signedOut();
    clearSession(response);
    return response;
  }
  if (profile.status !== 200) {
    return unavailableResponse();
  }

  return NextResponse.json({ user: profile.json });
}
