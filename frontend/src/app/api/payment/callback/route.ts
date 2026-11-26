// frontend/src/app/api/payment/callback/route.ts
//
// GET /api/payment/callback?Authority&Status
// The payment gateway's return address, on the storefront's public domain
// (set PAYMENT_CALLBACK_URL to it), so Nest itself need not be public. Nest
// verifies the payment and answers with a redirect to the result page; the
// order number is taken from it and the customer sent to our own result
// page.

import { NextResponse, type NextRequest } from 'next/server';
import { callUpstream, forwardedHeaders, serverEnv } from '@/lib/server/bff';

// The order number in Nest's redirect, if it points at the result page.
// Nest builds the address from its own FRONTEND_URL, which may differ from
// ours in host or a trailing slash, so only the path and the order number
// are read; the address the customer goes to is always built here.
function orderIdFrom(location: string | null | undefined): string | null {
  if (!location) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(location, 'http://nest.internal');
  } catch {
    return null;
  }
  if (url.pathname.replace(/\/+$/, '') !== '/payment/result') {
    return null;
  }
  const orderId = url.searchParams.get('orderId');
  return orderId && /^\d{1,12}$/.test(orderId) ? orderId : null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { nestUrl, frontendOrigin } = serverEnv();
  const resultPage = `${frontendOrigin}/payment/result`;

  const upstream = await callUpstream(
    `${nestUrl}/payment/callback${request.nextUrl.search}`,
    { headers: forwardedHeaders(request) },
  );

  const orderId =
    upstream?.status === 302
      ? orderIdFrom(upstream.headers.get('location'))
      : null;
  const target = orderId ? `${resultPage}?orderId=${orderId}` : resultPage;

  const response = NextResponse.redirect(target, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
