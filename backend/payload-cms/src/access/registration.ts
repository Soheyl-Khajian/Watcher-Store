// backend/payload-cms/src/access/registration.ts
//
// Who may create an account (POST /api/users). Customers sign up through
// the storefront (frontend/src/app/api/auth/register), which checks the
// form and sends REGISTRATION_SECRET in the X-Registration-Secret header;
// administrators create accounts in the admin panel. A sign-up sent
// straight to the CMS is refused, so the storefront's checks cannot be
// skipped.
//
// Without REGISTRATION_SECRET (allowed only outside production, src/env.ts)
// anyone may sign up, as before, so a development setup needs nothing more.
// The first-user screen of an empty admin panel does not use this rule.

import { createHash, timingSafeEqual } from 'crypto';
import type { Access } from 'payload';
import { env } from '../env';

export const REGISTRATION_HEADER = 'x-registration-secret';

// Equal-length digests, so the comparison takes the same time whatever
// was sent.
const digest = (value: string) => createHash('sha256').update(value).digest();

export function registrationAllowed(
  sent: string | null | undefined,
  secret: string | undefined,
  production: boolean,
): boolean {
  if (!secret) {
    return !production;
  }
  return (
    typeof sent === 'string' &&
    sent !== '' &&
    timingSafeEqual(digest(sent), digest(secret))
  );
}

export const canCreateUser: Access = ({ req }) =>
  req.user?.role === 'admin' ||
  registrationAllowed(
    req.headers?.get(REGISTRATION_HEADER),
    env.REGISTRATION_SECRET,
    env.NODE_ENV === 'production',
  );
