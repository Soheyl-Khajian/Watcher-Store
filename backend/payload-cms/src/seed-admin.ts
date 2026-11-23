// backend/payload-cms/src/seed-admin.ts
//
// Creates the administrator account from the environment, so a new
// deployment never has to rely on the admin panel's first-user screen (which
// anyone could reach until an account exists).
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... pnpm --filter payload-cms seed:admin
//
// Safe to run on every deployment: an existing administrator is left
// untouched, and an existing customer with the same email is not promoted.
//
// Locked out (no administrator left)? Make an existing account an
// administrator again, keeping its password:
//
//   ADMIN_EMAIL=you@example.com ADMIN_PROMOTE_EXISTING=true pnpm --filter payload-cms seed:admin
import { getPayload } from 'payload';
import configPromise from './payload.config';
import { ensureAdmin } from './utils/ensureAdmin';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD || undefined;
const promoteExisting = process.env.ADMIN_PROMOTE_EXISTING === 'true';

if (!email || (!password && !promoteExisting)) {
  console.error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD to create the administrator (or ADMIN_PROMOTE_EXISTING=true to promote an existing account).',
  );
  process.exit(1);
}

let exitCode = 0;
const payload = await getPayload({ config: await configPromise });

try {
  const result = await ensureAdmin(payload, {
    email,
    password,
    displayName: process.env.ADMIN_DISPLAY_NAME,
    promoteExisting,
  });

  console.log(
    {
      created: `Created administrator ${email}.`,
      exists: `Administrator ${email} already exists; nothing changed.`,
      promoted: `${email} is now an administrator (password unchanged).`,
    }[result],
  );
} catch (error) {
  console.error(
    `Could not create the administrator: ${error instanceof Error ? error.message : String(error)}`,
  );
  exitCode = 1;
}

await payload.destroy();
process.exit(exitCode);
