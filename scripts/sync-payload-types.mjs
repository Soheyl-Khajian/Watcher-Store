// Copies the generated Payload types into the storefront.
//
// The storefront only needs the plain interfaces, so the
// `declare module 'payload' { ... }` augmentation block is removed: the
// storefront does not depend on the payload package.
//
// Usage: pnpm sync:payload-types (after pnpm --filter payload-cms generate:types)
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'backend/payload-cms/src/payload-types.ts');
const target = join(root, 'frontend/src/types/payload-types.ts');

const generated = await readFile(source, 'utf8');
const withoutAugmentation = generated.replace(
  /^declare module 'payload' \{[\s\S]*?^\}\n?/m,
  '',
);

if (withoutAugmentation === generated) {
  throw new Error(
    `No "declare module 'payload'" block found in ${source}; check the generated file.`,
  );
}

const options = (await prettier.resolveConfig(target)) ?? {};
const formatted = await prettier.format(withoutAugmentation, {
  ...options,
  filepath: target,
});

await writeFile(target, formatted);
console.log(`Synced Payload types to ${target}`);
