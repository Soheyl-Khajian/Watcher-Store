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

// Optional settings left empty in .env count as unset.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const optionalText = z.preprocess(emptyToUndefined, z.string().optional());

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
    // requests. Required in production (see parseEnv for the default).
    PAYLOAD_PUBLIC_URL: z.preprocess(
      emptyToUndefined,
      z.string().url().optional(),
    ),
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
    // Shared with the storefront, which sends it with each sign-up
    // (access/registration.ts). Required in production.
    REGISTRATION_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z
        .string()
        .min(
          32,
          `REGISTRATION_SECRET must be at least 32 characters. ${GENERATE_SECRET}`,
        )
        .optional(),
    ),
    // Media storage. Unset S3_BUCKET: uploads go to the media/ folder (a
    // volume in docker-compose.prod.yml). Set: to this S3-compatible bucket
    // (AWS S3, Cloudflare R2, MinIO...), still served through Payload's
    // /api/media/file/ URLs with its access rules (src/storage.ts).
    S3_BUCKET: optionalText,
    // The bucket's region; "auto" for Cloudflare R2.
    S3_REGION: optionalText,
    // For a provider other than AWS, its API address.
    S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
    // Both, or neither (then the SDK's own credentials: an IAM role, ...).
    S3_ACCESS_KEY_ID: optionalText,
    S3_SECRET_ACCESS_KEY: optionalText,
    // Bucket name in the path instead of the host name (MinIO needs it).
    S3_FORCE_PATH_STYLE: z.preprocess(
      emptyToUndefined,
      z
        .enum(['true', 'false'])
        .default('false')
        .transform((value) => value === 'true'),
    ),
  })
  .superRefine((value, ctx) => {
    // Checked everywhere: a half-configured bucket would otherwise only
    // fail at the first upload.
    if (value.S3_BUCKET && !value.S3_REGION) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_REGION'],
        message:
          'S3_REGION is required with S3_BUCKET ("auto" for Cloudflare R2).',
      });
    }
    if (!value.S3_BUCKET) {
      const stray = (
        [
          'S3_REGION',
          'S3_ENDPOINT',
          'S3_ACCESS_KEY_ID',
          'S3_SECRET_ACCESS_KEY',
        ] as const
      ).filter((key) => value[key]);
      if (stray.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['S3_BUCKET'],
          message: `S3_BUCKET is not set, so ${stray.join(', ')} would be ignored and uploads stored on local disk. Set S3_BUCKET or remove them.`,
        });
      }
    }
    if (!value.S3_ACCESS_KEY_ID !== !value.S3_SECRET_ACCESS_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_SECRET_ACCESS_KEY'],
        message:
          'Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither.',
      });
    }

    // Only the running server (and the migration job) must have real
    // secrets; `next build` runs with NODE_ENV=production and placeholders.
    const strict =
      value.NODE_ENV === 'production' &&
      value.NEXT_PHASE !== 'phase-production-build';

    if (!strict) {
      return;
    }

    // Settings a production CMS cannot do without: its public address
    // (admin cookies, CSRF and media links depend on it), the secret that
    // lets the storefront create accounts, and the storefront's address and
    // secret for refreshing its cache after edits.
    const required = {
      PAYLOAD_PUBLIC_URL:
        'its public https address, such as https://cms.shop.example',
      REGISTRATION_SECRET: `shared with the storefront. ${GENERATE_SECRET}`,
      REVALIDATE_SECRET: `shared with the storefront. ${GENERATE_SECRET}`,
      STOREFRONT_INTERNAL_URL:
        'where this server reaches the storefront, such as http://frontend:3002',
    } as const;
    for (const [key, hint] of Object.entries(required)) {
      if (!value[key as keyof typeof required]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must be set in production: ${hint}`,
        });
      }
    }

    for (const key of ['REVALIDATE_SECRET', 'REGISTRATION_SECRET'] as const) {
      const secret = value[key];
      if (secret && PLACEHOLDER_SECRET.test(secret)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is still a placeholder. ${GENERATE_SECRET}`,
        });
      }
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

export type Env = Omit<z.infer<typeof envSchema>, 'PAYLOAD_PUBLIC_URL'> & {
  PAYLOAD_PUBLIC_URL: string;
};

// Exported separately so the rules can be unit-tested.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.parse(source);
  return {
    ...parsed,
    // Reduced to its origin (scheme, host, port); localhost in development.
    PAYLOAD_PUBLIC_URL: new URL(
      parsed.PAYLOAD_PUBLIC_URL ?? 'http://localhost:3000',
    ).origin,
  };
}

export const env = parseEnv(process.env);
