// frontend/src/middleware.ts
//
// Runs for every page and API route (not for build assets):
//
// - Sets a Content-Security-Policy with a fresh nonce (lib/security-headers).
//   The other security headers are fixed and come from next.config.ts.
// - Account pages need a logged-in customer. A visitor without a session
//   cookie goes to the login page first, and comes back here after logging
//   in. Whether the session is still valid is the API's call: pages that
//   find it was not send the customer to log in the same way
//   (useRequireSession).

import { NextResponse, type NextRequest } from 'next/server';
import {
  contentSecurityPolicy,
  createNonce,
  NONCE_HEADER,
  requiresSession,
} from './lib/security-headers';
import { sessionCookieFor } from './lib/session-cookie';
import { loginPathFor } from './lib/utils/safe-next';

const CSP_HEADER = 'Content-Security-Policy';

export function middleware(request: NextRequest): NextResponse {
  const frontendOrigin = new URL(
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3002',
  ).origin;
  const payloadOrigin = new URL(
    process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000/api',
  ).origin;

  const nonce = createNonce();
  const csp = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === 'development',
    payloadOrigin,
    upgradeInsecureRequests: frontendOrigin.startsWith('https://'),
  });

  const { pathname, search } = request.nextUrl;
  const { name } = sessionCookieFor(frontendOrigin);
  if (requiresSession(pathname) && !request.cookies.get(name)?.value) {
    const redirect = NextResponse.redirect(
      new URL(loginPathFor(pathname + search), request.url),
    );
    redirect.headers.set(CSP_HEADER, csp);
    return redirect;
  }

  // Next.js takes the nonce for its own scripts from the request's copy of
  // the policy; the layout reads it for the scripts the app adds.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, csp);
  requestHeaders.set(NONCE_HEADER, nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

export const config = {
  matcher: [
    // Everything except build assets, optimized images and the icons.
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon).*)',
  ],
};
