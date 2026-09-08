// frontend/src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_NESTJS_API_URL: z.string().url(),
  NEXT_PUBLIC_PAYLOAD_URL: z.string().url(),
  NEXT_PUBLIC_FRONTEND_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_NESTJS_API_URL: process.env.NEXT_PUBLIC_NESTJS_API_URL,
  NEXT_PUBLIC_PAYLOAD_URL: process.env.NEXT_PUBLIC_PAYLOAD_URL,
  NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
});
