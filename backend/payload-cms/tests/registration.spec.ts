import { describe, expect, it } from 'vitest';
import { boundedRead, MAX_PUBLIC_LIMIT } from '../src/hooks/limitPublicReads';

// src/env.ts reads process.env on import; access/registration imports it.
Object.assign(process.env, {
  PAYLOAD_SECRET: 'x'.repeat(64),
  DATABASE_URI: 'postgres://shop:Str0ng-Db-Passw0rd@db:5432/watcher_store',
  FRONTEND_URL: 'https://shop.example.test',
});
const { registrationAllowed } = await import('../src/access/registration');

describe('registrationAllowed', () => {
  const secret = 's'.repeat(48);

  it('accepts the shared secret and nothing else', () => {
    expect(registrationAllowed(secret, secret, true)).toBe(true);
    expect(registrationAllowed('wrong', secret, true)).toBe(false);
    expect(registrationAllowed('', secret, true)).toBe(false);
    expect(registrationAllowed(null, secret, false)).toBe(false);
  });

  it('is open without a secret only outside production', () => {
    expect(registrationAllowed(null, undefined, false)).toBe(true);
    expect(registrationAllowed(null, undefined, true)).toBe(false);
  });
});

describe('boundedRead', () => {
  it('leaves an ordinary request as it is', () => {
    expect(boundedRead({ limit: 12, depth: 1 })).toEqual({
      limit: 12,
      depth: 1,
      pagination: true,
    });
    expect(boundedRead({})).toEqual({ pagination: true });
  });

  it('caps requests for everything', () => {
    expect(boundedRead({ pagination: false }).limit).toBe(MAX_PUBLIC_LIMIT);
    expect(boundedRead({ limit: 0 }).limit).toBe(MAX_PUBLIC_LIMIT);
    expect(boundedRead({ limit: 10_000 }).limit).toBe(MAX_PUBLIC_LIMIT);
    expect(boundedRead({ depth: 9 }).depth).toBe(2);
  });
});
