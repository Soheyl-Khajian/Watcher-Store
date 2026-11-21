// backend/nest-api/src/env.ts

import { config } from 'dotenv';
import { join } from 'path';
import { z } from 'zod';

config({ path: join(__dirname, '../../../.env') });

// Values copied from .env.example. A deployment still using one would sign
// tokens with a publicly known secret.
const PLACEHOLDER_SECRET = /replace[-_ ]?with|change[-_ ]?me|build[-_ ]?only/i;

// Database passwords that appear in examples and default installs.
const WEAK_DATABASE_PASSWORDS = new Set([
  '',
  'postgres',
  'password',
  'admin',
  'root',
  'secret',
  'changeme',
  'change_me',
  '123456',
]);

// Used outside production only, matching the dev container's database.
const LOCAL_DATABASE_PASSWORD = 'postgres';

const envSchema = z
  .object({
    DATABASE_HOST: z.string().default('db'),
    DATABASE_PORT: z
      .string()
      .default('5432')
      .transform(Number)
      .pipe(z.number().int().positive()),
    POSTGRES_USER: z.string().default('postgres'),
    // No default: production must set it explicitly (see below).
    POSTGRES_PASSWORD: z.string().optional(),
    POSTGRES_DB: z.string().default('watcher_store'),
    NEST_SCHEMA: z
      .string()
      .regex(/^[a-z_][a-z0-9_]*$/, 'must be a bare lowercase SQL identifier')
      .default('nest_schema'),
    PAYLOAD_SCHEMA: z
      .string()
      .regex(/^[a-z_][a-z0-9_]*$/, 'must be a bare lowercase SQL identifier')
      .default('payload_schema'),
    PORT: z
      .string()
      .default('3001')
      .transform(Number)
      .pipe(z.number().int().positive()),
    JWT_SECRET: z
      .string()
      .min(
        32,
        'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32',
      ),
    // How long a login token stays valid, e.g. 60m, 12h, 7d.
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^[1-9]\d*[smhd]$/, 'JWT_EXPIRES_IN must look like 60m, 12h or 7d')
      .default('60m'),
    PAYLOAD_INTERNAL_URL: z.string().url(),
    // How long to wait for Payload before answering 503.
    PAYLOAD_TIMEOUT_MS: z
      .string()
      .default('5000')
      .transform(Number)
      .pipe(z.number().int().min(100).max(60_000)),
    FRONTEND_URL: z.string().url(),

    // Unpaid orders older than this are cancelled automatically.
    PENDING_ORDER_TTL_HOURS: z
      .string()
      .default('24')
      .transform(Number)
      .pipe(z.number().int().min(1).max(720)),
    // Requests per minute per client and route (all routes but /health).
    RATE_LIMIT_PER_MINUTE: z
      .string()
      .default('120')
      .transform(Number)
      .pipe(z.number().int().min(1)),
    // Login attempts per minute per client.
    RATE_LIMIT_LOGIN_PER_MINUTE: z
      .string()
      .default('5')
      .transform(Number)
      .pipe(z.number().int().min(1)),
    // Order attempts per minute per client.
    RATE_LIMIT_ORDERS_PER_MINUTE: z
      .string()
      .default('10')
      .transform(Number)
      .pipe(z.number().int().min(1)),
    // Which reverse proxies may set X-Forwarded-For, so rate limits apply to
    // the real client: "false" (default, no proxy), a number of proxy hops
    // such as "1", or addresses/subnets such as "loopback, 10.0.0.0/8".
    // "true" (trust anyone) is refused: clients could pick their own IP.
    TRUST_PROXY: z
      .string()
      .default('false')
      .refine((value) => value.trim().toLowerCase() !== 'true', {
        message:
          'TRUST_PROXY=true would let clients choose their own IP; use a hop count or proxy addresses',
      })
      .transform((value): boolean | number | string => {
        const trimmed = value.trim();
        if (trimmed === 'false' || trimmed === '' || trimmed === '0') {
          return false;
        }
        return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
      }),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    // Apply pending migrations when the API starts. Default: on in
    // development and tests, off in production, where the migrate job
    // (node dist/database/migrate.js) runs them once before the API starts.
    MIGRATIONS_RUN_ON_BOOT: z.enum(['true', 'false']).optional(),

    // Which gateway takes payments: none (payments answer 503) or mock
    // (development only: no money moves and the customer's reported result
    // is believed).
    PAYMENT_GATEWAY: z.enum(['none', 'mock']).default('none'),
    // Replaced by PAYMENT_GATEWAY; read only to point old settings there.
    ALLOW_MOCK_PAYMENT: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    // An old setting that would otherwise be ignored without a word.
    if (value.ALLOW_MOCK_PAYMENT?.trim().toLowerCase() === 'true') {
      ctx.addIssue({
        code: 'custom',
        path: ['ALLOW_MOCK_PAYMENT'],
        message:
          'ALLOW_MOCK_PAYMENT was replaced: set PAYMENT_GATEWAY=mock instead and remove ALLOW_MOCK_PAYMENT.',
      });
    }

    if (value.NODE_ENV !== 'production') {
      return;
    }

    if (value.PAYMENT_GATEWAY === 'mock') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENT_GATEWAY'],
        message:
          'PAYMENT_GATEWAY=mock must not be used when NODE_ENV=production.',
      });
    }

    if (PLACEHOLDER_SECRET.test(value.JWT_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message:
          'JWT_SECRET is still a placeholder. Generate one with: openssl rand -hex 32',
      });
    }

    const password = value.POSTGRES_PASSWORD;
    if (password === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['POSTGRES_PASSWORD'],
        message: 'POSTGRES_PASSWORD must be set in production.',
      });
    } else if (WEAK_DATABASE_PASSWORDS.has(password.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['POSTGRES_PASSWORD'],
        message:
          'POSTGRES_PASSWORD is empty or a default password. Use a strong one in production.',
      });
    }
  })
  .transform((value) => ({
    ...value,
    POSTGRES_PASSWORD: value.POSTGRES_PASSWORD ?? LOCAL_DATABASE_PASSWORD,
    MIGRATIONS_RUN_ON_BOOT:
      value.MIGRATIONS_RUN_ON_BOOT === undefined
        ? value.NODE_ENV !== 'production'
        : value.MIGRATIONS_RUN_ON_BOOT === 'true',
  }));

export type Env = z.infer<typeof envSchema>;

// Exported separately so the validation rules can be unit-tested.
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
