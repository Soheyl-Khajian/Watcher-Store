// backend/payload-cms/src/utils/ensureAdmin.ts

import type { Payload } from 'payload';

export interface AdminAccount {
  email: string;
  // Needed only to create the account.
  password?: string;
  displayName?: string;
  // Make an existing customer account an administrator (keeping its
  // password). Off by default, so an existing account is never promoted
  // without being asked; this is the way back in when no administrator is
  // left.
  promoteExisting?: boolean;
}

// Creates the administrator account if it does not exist yet. Safe to run on
// every deployment: an existing administrator is left untouched (its
// password is not reset), and an existing customer account with the same
// email is never promoted silently.
export async function ensureAdmin(
  payload: Payload,
  {
    email,
    password,
    displayName = 'Watcher Store Admin',
    promoteExisting = false,
  }: AdminAccount,
): Promise<'created' | 'exists' | 'promoted'> {
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

    if (!promoteExisting) {
      throw new Error(
        `${email} already exists as a customer account. Promote it in the admin panel, choose another ADMIN_EMAIL, or set ADMIN_PROMOTE_EXISTING=true to make it an administrator.`,
      );
    }

    await payload.update({
      collection: 'users',
      id: existing.id,
      data: { role: 'admin' },
    });
    return 'promoted';
  }

  if (!password) {
    throw new Error(`Set ADMIN_PASSWORD to create the administrator ${email}.`);
  }

  await payload.create({
    collection: 'users',
    data: { email, password, displayName, role: 'admin' },
  });

  return 'created';
}
