// backend/payload-cms/src/utils/ensureAdmin.ts

import type { Payload } from 'payload';

export interface AdminAccount {
  email: string;
  password: string;
  displayName?: string;
}

// Creates the administrator account if it does not exist yet. Safe to run on
// every deployment: an existing administrator is left untouched (its
// password is not reset), and an existing customer account with the same
// email is never promoted silently.
export async function ensureAdmin(
  payload: Payload,
  { email, password, displayName = 'Watcher Store Admin' }: AdminAccount,
): Promise<'created' | 'exists'> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
  });
  const existing = docs[0];

  if (existing) {
    if (existing.role === 'admin') {
      return 'exists';
    }

    throw new Error(
      `${email} already exists as a customer account. Promote it in the admin panel or choose another ADMIN_EMAIL.`,
    );
  }

  await payload.create({
    collection: 'users',
    data: { email, password, displayName, role: 'admin' },
  });

  return 'created';
}
