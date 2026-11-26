// frontend/src/app/api/auth/register/route.ts
//
// POST /api/auth/register { email, password } -> 201
// Creates the customer account in Payload, from this server. The CMS
// accepts sign-ups only with REGISTRATION_SECRET, so every account comes
// through these checks.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  callUpstream,
  errorResponse,
  forwardedHeaders,
  rejectCrossSite,
  serverEnv,
  unavailableResponse,
} from '@/lib/server/bff';

// Payload requires at least 8 characters; the upper bound only keeps
// absurd inputs away from the password hash.
const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const invalid = () =>
  errorResponse(
    400,
    'REGISTRATION_INVALID',
    'Send a valid email and a password of at least 8 characters.',
  );

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
    return invalid();
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return invalid();
  }

  const env = serverEnv();
  const created = await callUpstream(`${env.payloadUrl}/users`, {
    method: 'POST',
    headers: {
      ...forwardedHeaders(request),
      'Content-Type': 'application/json',
      ...(env.registrationSecret
        ? { 'X-Registration-Secret': env.registrationSecret }
        : {}),
    },
    body: JSON.stringify(parsed.data),
  });

  if (!created || created.status >= 500) {
    return unavailableResponse();
  }
  if (created.status === 201 || created.status === 200) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  if (created.status === 400 && emailRejected(created.json)) {
    return errorResponse(
      409,
      'EMAIL_TAKEN',
      'An account with this email exists.',
    );
  }
  return invalid();
}
