// backend/payload-cms/src/seed.ts
//
// The category tree and the footer (src/seed/data/):
//   pnpm --filter payload-cms seed
// Existing categories are kept; the footer is replaced. For a full demo
// store (products, posts, pages, accounts) use seed:demo instead.

import { getPayload } from 'payload';
import configPromise from './payload.config';
import { seedCategories, seedFooter } from './seed/catalogBasics';

const payload = await getPayload({ config: await configPromise });

let exitCode = 0;
try {
  const { tally } = await seedCategories(payload, (m) => console.log(`+ ${m}`));
  console.log(
    `Categories: ${tally.created} created, ${tally.existing} already there.`,
  );
  await seedFooter(payload, { overwrite: true });
  console.log('Footer updated.');
} catch (error) {
  console.error(error);
  exitCode = 1;
}

process.exit(exitCode);
