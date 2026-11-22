import { describe, expect, it } from 'vitest';
import {
  contentSecurityPolicy,
  createNonce,
  requiresSession,
} from './security-headers';

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split('; ').map((part) => {
      const [name, ...values] = part.split(' ');
      return [name, values];
    }),
  );
}

const base = {
  nonce: 'abc123',
  dev: false,
  payloadOrigin: 'https://cms.example.com',
  upgradeInsecureRequests: false,
};

describe('contentSecurityPolicy', () => {
  it('only runs scripts carrying the nonce', () => {
    const d = directives(contentSecurityPolicy(base));
    expect(d.get('script-src')).toEqual([
      "'self'",
      "'nonce-abc123'",
      "'strict-dynamic'",
    ]);
    expect(d.get('object-src')).toEqual(["'none'"]);
    expect(d.get('base-uri')).toEqual(["'self'"]);
  });

  it('refuses to be framed', () => {
    const d = directives(contentSecurityPolicy(base));
    expect(d.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('allows API calls to Payload, and images only from the shop', () => {
    const d = directives(contentSecurityPolicy(base));
    expect(d.get('img-src')).toEqual(["'self'", 'data:', 'blob:']);
    expect(d.get('connect-src')).toEqual(["'self'", 'https://cms.example.com']);
  });

  it('adds eval and the hot-reload socket only in development', () => {
    const prod = directives(contentSecurityPolicy(base));
    expect(prod.get('script-src')).not.toContain("'unsafe-eval'");
    const dev = directives(contentSecurityPolicy({ ...base, dev: true }));
    expect(dev.get('script-src')).toContain("'unsafe-eval'");
    expect(dev.get('connect-src')).toContain('ws:');
  });

  it('upgrades insecure requests only when asked', () => {
    expect(contentSecurityPolicy(base)).not.toContain(
      'upgrade-insecure-requests',
    );
    expect(
      contentSecurityPolicy({ ...base, upgradeInsecureRequests: true }),
    ).toMatch(/; upgrade-insecure-requests$/);
  });
});

describe('createNonce', () => {
  it('is new each time and safe inside the header', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(a);
  });
});

describe('requiresSession', () => {
  it.each([
    '/profile',
    '/profile/orders',
    '/checkout',
    '/checkout/',
    '/payment/result',
  ])('guards %s', (path) => {
    expect(requiresSession(path)).toBe(true);
  });

  it.each(['/', '/products', '/profiles', '/checkouts', '/payment/result/x'])(
    'leaves %s public',
    (path) => {
      expect(requiresSession(path)).toBe(false);
    },
  );
});
