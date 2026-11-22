// frontend/src/lib/security-headers.ts
//
// The storefront's Content-Security-Policy, built per request by the
// middleware with a fresh nonce. Next.js reads the nonce from the request's
// CSP header and puts it on its own scripts; 'strict-dynamic' lets those
// scripts load the rest of the app. Nothing else may run: no inline
// scripts, no scripts from other sites, no plugins, and no other site may
// frame the shop.
//
// No Node-only APIs here: the middleware runs in the edge runtime.

export interface CspOptions {
  nonce: string;
  // next dev needs eval (source maps, React's dev tools) and a websocket
  // for hot reload.
  dev: boolean;
  // Payload's public origin: the cart and checkout read product details
  // from its API in the browser. (Images do not come from it: media is
  // served from the storefront's own /uploads/.)
  payloadOrigin: string;
  // Only when the shop itself is served over https; on a plain-http
  // address it would break every request.
  upgradeInsecureRequests: boolean;
}

// The nonce, passed to the page render for scripts the app adds itself
// (app/layout.tsx).
export const NONCE_HEADER = 'x-nonce';

export function contentSecurityPolicy(options: CspOptions): string {
  const { nonce, dev, payloadOrigin, upgradeInsecureRequests } = options;
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(dev ? ["'unsafe-eval'"] : []),
      ],
    ],
    // React's style attributes and next/font's inline rules.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", payloadOrigin, ...(dev ? ['ws:'] : [])]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  if (upgradeInsecureRequests) {
    directives.push(['upgrade-insecure-requests', []]);
  }
  return directives
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

// 128 random bits, base64: unguessable, and new for every response.
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// Pages that need a logged-in customer (see middleware.ts).
const ACCOUNT_PATHS = [/^\/profile(?:\/|$)/, /^\/checkout(?:\/|$)/];

export function requiresSession(pathname: string): boolean {
  return (
    pathname === '/payment/result' ||
    ACCOUNT_PATHS.some((pattern) => pattern.test(pathname))
  );
}
