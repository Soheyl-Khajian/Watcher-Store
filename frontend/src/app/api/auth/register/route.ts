// frontend/src/app/api/auth/register/route.ts
//
// POST /api/auth/register { email, password } -> 201
// Creates the customer account in Payload, from this server.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  callUpstream,
  errorResponse,
  forwardedHeaders,
  rejectCrossSite,
  serverEnv,
  UNAVAILABLE_MESSAGE,
} from '@/lib/server/bff';

// Payload requires at least 8 characters; the upper bound only keeps
// absurd inputs away from the password hash.
const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const INVALID_MESSAGE = 'ایمیل معتبر و رمز عبوری با دست‌کم ۸ نویسه وارد کنید.';
const DUPLICATE_MESSAGE = 'این ایمیل قبلاً ثبت شده است.';

// Payload reports field problems as
// { errors: [{ data: { errors: [{ path: 'email', message }] } }] }.
// With the address already validated here, an email problem means the
// address is taken.
function emailRejected(body: unknown): boolean {
  const errors = (body as { errors?: unknown } | undefined)?.errors;
  if (!Array.isArray(errors)) {
    return false;
  }
  return errors.some((error) => {
    const fields = (error as { data?: { errors?: unknown } } | null)?.data
      ?.errors;
    return (
      Array.isArray(fields) &&
      fields.some((field) => (field as { path?: unknown })?.path === 'email')
    );
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refused = rejectCrossSite(request);
  if (refused) {
    return refused;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, INVALID_MESSAGE);
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, INVALID_MESSAGE);
  }

  const created = await callUpstream(`${serverEnv().payloadUrl}/users`, {
    method: 'POST',
    headers: {
      ...forwardedHeaders(request),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parsed.data),
  });

  if (!created || created.status >= 500) {
    return errorResponse(503, UNAVAILABLE_MESSAGE);
  }
  if (created.status === 201 || created.status === 200) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if (created.status === 400 && emailRejected(created.json)) {
    return errorResponse(409, DUPLICATE_MESSAGE);
  }
  return errorResponse(400, INVALID_MESSAGE);
}
