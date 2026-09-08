// backend/nest-api/src/env.ts
import { config } from 'dotenv';
import { join } from 'path';
import { z } from 'zod';

config({ path: join(__dirname, '../../../.env') });

const envSchema = z.object({
  DATABASE_HOST: z.string().default('db'),
  DATABASE_PORT: z
    .string()
    .default('5432')
    .transform(Number)
    .pipe(z.number().int().positive()),
  POSTGRES_USER: z.string().default('postgres'),
  POSTGRES_PASSWORD: z.string().default('postgres'),
  POSTGRES_DB: z.string().default('watcher_store'),
  NEST_SCHEMA: z.string().default('nest_schema'),
  PORT: z
    .string()
    .default('3001')
    .transform(Number)
    .pipe(z.number().int().positive()),
  JWT_SECRET: z.string().min(32),
  PAYLOAD_INTERNAL_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
