// frontend/src/lib/session-cookie.ts
//
// The session cookie's name and Secure flag, shared by the /api routes
// (which set it) and the middleware (which only checks it exists). No
// Node-only APIs here: the middleware runs in the edge runtime.

export interface SessionCookie {
  name: string;
  secure: boolean;
}

// Over https the cookie is Secure and uses the __Host- prefix (browsers then
// refuse it unless it is Secure, host-only and for the whole site). A plain
// http storefront (local development, the local production stack) cannot
// use either.
export function sessionCookieFor(frontendOrigin: string): SessionCookie {
  const secure = frontendOrigin.startsWith('https://');
  return { name: secure ? '__Host-ws_session' : 'ws_session', secure };
}
