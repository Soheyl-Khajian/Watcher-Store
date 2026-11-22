import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../../.env') });

// Values copied from .env.example or the Docker build stage. A deployment
// that still uses one of these would run with a publicly known secret.
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

const GENERATE_SECRET = 'Generate one with: openssl rand -hex 32';

const envSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    // Set by Next.js while it builds the app with build-time placeholders.
    NEXT_PHASE: z.string().optional(),
    PAYLOAD_SECRET: z
      .string()
      .min(
        32,
        `PAYLOAD_SECRET must be at least 32 characters. ${GENERATE_SECRET}`,
      ),
    PAYLOAD_SCHEMA: z.string().default('payload_schema'),
    DATABASE_URI: z
      .string()
      .url('DATABASE_URI must be a URL')
      .refine((value) => /^postgres(ql)?:\/\//.test(value), {
        message: 'DATABASE_URI must start with postgres:// or postgresql://',
      }),
    FRONTEND_URL: z.string().url(),
    // Where browsers reach this CMS (admin panel and media). Used as Payload's
    // serverURL and as the only origin trusted for cookie-authenticated
    // requests. Reduced to its origin (scheme, host, port).
    PAYLOAD_PUBLIC_URL: z
      .string()
      .url()
      .default('http://localhost:3000')
      .transform((value) => new URL(value).origin),
    PAYLOAD_INTERNAL_URL: z.string().url().optional(),
    NEST_INTERNAL_URL: z.string().url().optional(), // Server-side URL of the Nest API, used by the admin Orders view.
    // Where this server reaches the storefront, to tell it about content
    // changes (hooks/revalidateStorefront.ts). Optional, like the secret.
    STOREFRONT_INTERNAL_URL: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .url()
        .transform((value) => value.replace(/\/+$/, ''))
        .optional(),
    ),
    // Shared with the storefront's /api/revalidate.
    REVALIDATE_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .min(
          32,
          `REVALIDATE_SECRET must be at least 32 characters. ${GENERATE_SECRET}`,
        )
        .optional(),
    ),
  })
  .superRefine((value, ctx) => {
    // Only the running server (and the migration job) must have real
    // secrets; `next build` runs with NODE_ENV=production and placeholders.
    const strict =
      value.NODE_ENV === 'production' &&
      value.NEXT_PHASE !== 'phase-production-build';

    if (!strict) {
      return;
    }

    if (
      value.REVALIDATE_SECRET &&
      PLACEHOLDER_SECRET.test(value.REVALIDATE_SECRET)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['REVALIDATE_SECRET'],
        message: `REVALIDATE_SECRET is still a placeholder. ${GENERATE_SECRET}`,
      });
    }

    if (PLACEHOLDER_SECRET.test(value.PAYLOAD_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYLOAD_SECRET'],
        message: `PAYLOAD_SECRET is still a placeholder. ${GENERATE_SECRET}`,
      });
    }

    const password = decodeURIComponent(new URL(value.DATABASE_URI).password);
    if (WEAK_DATABASE_PASSWORDS.has(password.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URI'],
        message:
          'DATABASE_URI uses an empty or default database password. Set a strong POSTGRES_PASSWORD and use it in DATABASE_URI.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

// Exported separately so the rules can be unit-tested.
export function parseEnv(source: Record<string, string | undefined>): Env {
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
