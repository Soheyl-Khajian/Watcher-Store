// backend/payload-cms/src/seed-demo.ts
//
// Fills the store with demo data (src/seed/demo.ts):
//   pnpm --filter payload-cms seed:demo
// In a production container:
//   ./node_modules/.bin/payload run src/seed-demo.ts
//
// Optional accounts, from the environment:
//   DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD
//   DEMO_CUSTOMER_EMAIL / DEMO_CUSTOMER_PASSWORD
// With NODE_ENV=production it refuses to run unless ALLOW_DEMO_SEED=true
// (a deployment meant as a demo). Safe to run again.

import { getPayload } from 'payload';
import configPromise from './payload.config';
import { demoSeedAllowed, seedDemo, type DemoAccount } from './seed/demo';

if (!demoSeedAllowed(process.env)) {
  console.error(
    'Refusing to add demo data to a production database. Set ALLOW_DEMO_SEED=true if this deployment is meant as a demo.',
  );
  process.exit(1);
}

function account(prefix: string): DemoAccount | undefined {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email && !password) return undefined;
  if (!email || !password || password.length < 8) {
    console.error(
      `Set both ${prefix}_EMAIL and ${prefix}_PASSWORD (at least 8 characters), or neither.`,
    );
    process.exit(1);
  }
  return { email, password };
}

const admin = account('DEMO_ADMIN');
const customer = account('DEMO_CUSTOMER');

const payload = await getPayload({ config: await configPromise });

let exitCode = 0;
try {
  const result = await seedDemo(payload, {
    admin,
    customer,
    log: (message) => console.log(`+ ${message}`),
  });
  const line = (label: string, t: { created: number; existing: number }) =>
    `${label}: ${t.created} created, ${t.existing} already there`;
  console.log(
    [
      'Demo data ready.',
      line('Categories', result.categories),
      line('Photos', result.media),
      line('Products', result.products),
      line('Posts', result.posts),
      line('Pages', result.pages),
      `Footer: ${result.footer === 'set' ? 'filled in' : 'kept as it was'}`,
      `Demo admin: ${result.admin}`,
      `Demo customer: ${result.customer}`,
    ].join('\n'),
  );
} catch (error) {
  console.error(error);
  exitCode = 1;
}

process.exit(exitCode);
