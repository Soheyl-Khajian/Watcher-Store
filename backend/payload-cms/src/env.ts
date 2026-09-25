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
  PAYLOAD_INTERNAL_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
