// backend/nest-api/src/env.ts

import { config } from 'dotenv';
import { join } from 'path';
import { z } from 'zod';

config({ path: join(__dirname, '../../../.env') });

const envSchema = z
  .object({
    DATABASE_HOST: z.string().default('db'),
    DATABASE_PORT: z
      .string()
      .default('5432')
      .transform(Number)
      .pipe(z.number().int().positive()),
    POSTGRES_USER: z.string().default('postgres'),
    POSTGRES_PASSWORD: z.string().default('postgres'),
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
    JWT_SECRET: z.string().min(32),
    PAYLOAD_INTERNAL_URL: z.string().url(),
    FRONTEND_URL: z.string().url(),
    NODE_ENV: z.string().optional(),
    // Development-only. Enables the simulated payment flow, which trusts the
    // client-supplied status. Anything other than 'true' or 'false' fails
    // startup so a typo cannot silently change behavior.
    ALLOW_MOCK_PAYMENT: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine(
    (value) => !(value.NODE_ENV === 'production' && value.ALLOW_MOCK_PAYMENT),
    {
      message:
        'ALLOW_MOCK_PAYMENT must not be enabled when NODE_ENV=production.',
      path: ['ALLOW_MOCK_PAYMENT'],
    },
  );

export const env = envSchema.parse(process.env);
