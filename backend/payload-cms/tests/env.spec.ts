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

  describe('storefront revalidation', () => {
    const secret = 'z'.repeat(40);

    it('is off unless configured; empty values count as unset', () => {
      const env = parseEnv({
        ...base,
        STOREFRONT_INTERNAL_URL: '',
        REVALIDATE_SECRET: '',
      });
      expect(env.STOREFRONT_INTERNAL_URL).toBeUndefined();
      expect(env.REVALIDATE_SECRET).toBeUndefined();
    });

    it('accepts a storefront address and a strong secret', () => {
      const env = parseEnv({
        ...production,
        STOREFRONT_INTERNAL_URL: 'http://frontend:3002/',
        REVALIDATE_SECRET: secret,
      });
      expect(env.STOREFRONT_INTERNAL_URL).toBe('http://frontend:3002');
      expect(env.REVALIDATE_SECRET).toBe(secret);
    });

    it('refuses a short secret', () => {
      expect(() =>
        parseEnv({ ...base, REVALIDATE_SECRET: 'too-short' }),
      ).toThrow(/REVALIDATE_SECRET/);
    });

    it('refuses a placeholder secret in production', () => {
      expect(() =>
        parseEnv({
          ...production,
          REVALIDATE_SECRET: 'CHANGE_ME-' + 'x'.repeat(32),
        }),
      ).toThrow(/REVALIDATE_SECRET/);
    });
  });

  describe('media storage (S3)', () => {
    const bucket = {
      S3_BUCKET: 'watcher-media',
      S3_REGION: 'auto',
      S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      S3_ACCESS_KEY_ID: 'key-id',
      S3_SECRET_ACCESS_KEY: 'secret-key',
    };

    it('stores media on local disk when no bucket is set', () => {
      const env = parseEnv({ ...production, S3_BUCKET: '', S3_REGION: '' });
      expect(env.S3_BUCKET).toBeUndefined();
      expect(env.S3_FORCE_PATH_STYLE).toBe(false);
    });

    it('accepts a complete bucket configuration', () => {
      const env = parseEnv({
        ...production,
        ...bucket,
        S3_FORCE_PATH_STYLE: 'true',
      });
      expect(env.S3_BUCKET).toBe('watcher-media');
      expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    });

    it('accepts a bucket without keys (the SDK finds its own)', () => {
      expect(() =>
        parseEnv({ ...production, S3_BUCKET: 'b', S3_REGION: 'eu-west-1' }),
      ).not.toThrow();
    });

    it('requires a region with a bucket', () => {
      expect(() => parseEnv({ ...base, ...bucket, S3_REGION: '' })).toThrow(
        /S3_REGION/,
      );
    });

    it('refuses one key without the other', () => {
      expect(() =>
        parseEnv({ ...base, ...bucket, S3_SECRET_ACCESS_KEY: '' }),
      ).toThrow(/S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY/);
    });

    it('refuses bucket settings without a bucket (uploads would go to disk)', () => {
      expect(() => parseEnv({ ...base, ...bucket, S3_BUCKET: '' })).toThrow(
        /S3_BUCKET is not set/,
      );
    });

    it('refuses a malformed endpoint', () => {
      expect(() =>
        parseEnv({ ...base, ...bucket, S3_ENDPOINT: 'not a url' }),
      ).toThrow(/S3_ENDPOINT/);
    });
  });
});
