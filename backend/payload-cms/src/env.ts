import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../../.env') });

const envSchema = z.object({
  PAYLOAD_SECRET: z.string().min(32),
  PAYLOAD_SCHEMA: z.string().default('payload_schema'),
  DATABASE_URI: z.string().startsWith('postgres://'),
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
});

export const env = envSchema.parse(process.env);
