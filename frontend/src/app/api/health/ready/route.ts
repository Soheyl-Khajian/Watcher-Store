// frontend/src/app/api/health/ready/route.ts
//
// Readiness: can the storefront serve pages right now? 503 when Payload or
// Nest is down (lib/server/readiness), so a load balancer stops sending
// traffic here. /api/health stays liveness only (the Docker HEALTHCHECK):
// a backend outage must not get this container restarted.

import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/server/readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const body = await checkReadiness();
  return NextResponse.json(body, {
    status: body.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
