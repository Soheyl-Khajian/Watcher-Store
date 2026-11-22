// frontend/src/app/api/auth/logout/route.ts
//
// POST /api/auth/logout -> 204, session cookie cleared.

import { NextResponse, type NextRequest } from 'next/server';
import { clearSession, rejectCrossSite } from '@/lib/server/bff';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = rejectCrossSite(request);
  if (refused) {
    return refused;
  }

  const response = new NextResponse(null, { status: 204 });
  clearSession(response);
  return response;
}
