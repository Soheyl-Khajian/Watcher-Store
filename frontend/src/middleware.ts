// frontend/src/middleware.ts
//
// Runs for every page and API route (not for build assets):
//
// - Language: an address without a language prefix redirects to one
//   (i18n/routing.ts), and the language of each page visited is remembered
//   in a cookie for the next unprefixed address.
// - Sets a Content-Security-Policy with a fresh nonce (lib/security-headers).
//   The other security headers are fixed and come from next.config.ts.
// - Account pages need a logged-in customer. A visitor without a session
//   cookie goes to the login page first, and comes back here after logging
//   in. Whether the session is still valid is the API's call: pages that
//   find it was not send the customer to log in the same way
//   (useRequireSession).

import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, LOCALE_HEADER } from './i18n/config';
import { localizeHref } from './i18n/paths';
import { routeLocale } from './i18n/routing';
import { localeSettings } from './i18n/settings';
import {
  contentSecurityPolicy,
  createNonce,
  NONCE_HEADER,
  requiresSession,
} from './lib/security-headers';
import { sessionCookieFor } from './lib/session-cookie';
import { loginPathFor } from './lib/utils/safe-next';

const CSP_HEADER = 'Content-Security-Policy';
const ONE_YEAR = 60 * 60 * 24 * 365;

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
  const redirectTo = (location: string, status: 307 | 308) => {
    const redirect = NextResponse.redirect(
      new URL(location, request.url),
      status,
    );
    redirect.headers.set(CSP_HEADER, csp);
    return redirect;
  };

  const { pathname, search } = request.nextUrl;
  const route = routeLocale(
    pathname,
    search,
    localeSettings(),
    request.cookies.get(LOCALE_COOKIE)?.value,
  );
  if (route.kind === 'redirect') {
    // Permanent: the unprefixed addresses of before keep their links.
    return redirectTo(route.location, 308);
  }

  if (route.kind === 'page') {
    const { name } = sessionCookieFor(frontendOrigin);
    if (requiresSession(route.path) && !request.cookies.get(name)?.value) {
      return redirectTo(
        localizeHref(route.locale, loginPathFor(route.path + search)),
        307,
      );
    }
  }

  // Next.js takes the nonce for its own scripts from the request's copy of
  // the policy; the layout reads it for the scripts the app adds.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, csp);
  requestHeaders.set(NONCE_HEADER, nonce);
  // The page's language for server components (i18n/server.ts); never
  // taken from the browser.
  requestHeaders.delete(LOCALE_HEADER);
  if (route.kind === 'page') {
    requestHeaders.set(LOCALE_HEADER, route.locale);
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);

  if (
    route.kind === 'page' &&
    request.cookies.get(LOCALE_COOKIE)?.value !== route.locale
  ) {
    response.cookies.set(LOCALE_COOKIE, route.locale, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
      httpOnly: true,
      secure: frontendOrigin.startsWith('https://'),
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except build assets, images (optimized ones and media
    // files) and the icons.
    '/((?!_next/static|_next/image|uploads/|favicon.ico|icon.svg|apple-icon).*)',
  ],
};
