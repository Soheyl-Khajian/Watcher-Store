import { randomBytes } from 'crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { parseEnv as ParseEnv } from '../src/env';

const strongSecret = randomBytes(32).toString('hex');

const base = {
  PAYLOAD_SECRET: strongSecret,
  DATABASE_URI: 'postgres://shop:Str0ng-Db-Passw0rd@db:5432/watcher_store',
  FRONTEND_URL: 'https://shop.example.test',
};

const production = { ...base, NODE_ENV: 'production' };

describe('Payload environment', () => {
  let parseEnv: typeof ParseEnv;

  // src/env.ts also parses process.env when imported; give it a valid one.
  beforeAll(async () => {
    Object.assign(process.env, base);
    ({ parseEnv } = await import('../src/env'));
  });

  it('accepts a complete production configuration', () => {
    const env = parseEnv(production);

    expect(env.PAYLOAD_SCHEMA).toBe('payload_schema');
    expect(env.PAYLOAD_PUBLIC_URL).toBe('http://localhost:3000');
  });

  it('accepts postgresql:// database URLs', () => {
    expect(() =>
      parseEnv({
        ...production,
        DATABASE_URI: 'postgresql://shop:Str0ng-Db-Passw0rd@db/watcher_store',
      }),
    ).not.toThrow();
  });

  it.each(['mysql://shop:pw@db/watcher_store', 'not a url'])(
    'rejects the database URL %p',
    (DATABASE_URI) => {
      expect(() => parseEnv({ ...base, DATABASE_URI })).toThrow(/DATABASE_URI/);
    },
  );

  it('always requires a secret of at least 32 characters', () => {
    expect(() => parseEnv({ ...base, PAYLOAD_SECRET: 'too-short' })).toThrow(
      /PAYLOAD_SECRET/,
    );
  });

  describe('in production', () => {
    it.each([
      'replace-with-64-char-hex-secret-from-openssl-rand-hex-32',
      'CHANGE_ME-CHANGE_ME-CHANGE_ME-CHANGE_ME',
      'build-only-secret-00000000000000000000000000000000',
    ])('rejects the placeholder secret %p', (PAYLOAD_SECRET) => {
      expect(() => parseEnv({ ...production, PAYLOAD_SECRET })).toThrow(
        /PAYLOAD_SECRET/,
      );
    });

    it.each(['postgres', 'password', 'changeme', ''])(
      'rejects the weak database password %p',
      (password) => {
        expect(() =>
          parseEnv({
            ...production,
            DATABASE_URI: `postgres://shop:${password}@db:5432/watcher_store`,
          }),
        ).toThrow(/DATABASE_URI/);
      },
    );
  });

  // These rules only matter for the running server.
  it('allows placeholders outside production', () => {
    expect(() =>
      parseEnv({
        ...base,
        NODE_ENV: 'development',
        PAYLOAD_SECRET:
          'replace-with-64-char-hex-secret-from-openssl-rand-hex-32',
        DATABASE_URI: 'postgres://postgres:postgres@db:5432/watcher_store',
      }),
    ).not.toThrow();
  });

  // next build loads the config with build-time placeholders only.
  it('allows placeholders while Next.js builds the app', () => {
    expect(() =>
      parseEnv({
        ...production,
        NEXT_PHASE: 'phase-production-build',
        PAYLOAD_SECRET: 'build-only-secret-00000000000000000000000000000000',
        DATABASE_URI: 'postgres://postgres:postgres@127.0.0.1:5432/x',
      }),
    ).not.toThrow();
  });
});
