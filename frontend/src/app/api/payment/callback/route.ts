// frontend/src/app/api/payment/callback/route.ts
//
// GET /api/payment/callback?Authority&Status
// The payment gateway's return address, on the storefront's public domain
// (set PAYMENT_CALLBACK_URL to it), so Nest itself need not be public. Nest
// verifies the payment and answers with a redirect to the result page,
// which is passed on to the browser.

import { NextResponse, type NextRequest } from 'next/server';
import { callUpstream, forwardedHeaders, serverEnv } from '@/lib/server/bff';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { nestUrl, frontendOrigin } = serverEnv();
  const resultPage = `${frontendOrigin}/payment/result`;

  const upstream = await callUpstream(
    `${nestUrl}/payment/callback${request.nextUrl.search}`,
    { headers: forwardedHeaders(request) },
  );

  // Only ever redirect to our own result page.
  const location = upstream?.headers.get('location');
  const target =
    upstream?.status === 302 &&
    location &&
    (location === resultPage || location.startsWith(`${resultPage}?`))
      ? location
      : resultPage;

  return NextResponse.redirect(target, 302);
}
