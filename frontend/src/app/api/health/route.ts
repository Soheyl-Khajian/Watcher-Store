// frontend/src/app/api/health/route.ts
//
// Liveness: is the server process running? Independent of Payload and
// Nest, so their outage never gets this container restarted. Used by the
// Docker HEALTHCHECK. Readiness (can it serve pages?) is /api/health/ready.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
