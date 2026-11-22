// frontend/src/middleware.ts
//
// Account pages need a logged-in customer. A visitor without a session
// cookie goes to the login page first, and comes back here after logging
// in. Whether the session is still valid is the API's call: pages that find
// it was not send the customer to log in the same way (useRequireSession).

import { NextResponse, type NextRequest } from 'next/server';
import { sessionCookieFor } from './lib/session-cookie';
import { loginPathFor } from './lib/utils/safe-next';

export function middleware(request: NextRequest): NextResponse {
  const frontendOrigin = new URL(
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3002',
  ).origin;
  const { name } = sessionCookieFor(frontendOrigin);

  if (request.cookies.get(name)?.value) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(
    new URL(loginPathFor(pathname + search), request.url),
  );
}

export const config = {
  matcher: ['/profile/:path*', '/checkout/:path*', '/payment/verify'],
};
