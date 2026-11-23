// backend/payload-cms/src/seed/catalogBasics.ts
//
// The category tree and the footer, from data/categories.json and
// data/footer.json. Used by `pnpm seed` and by the demo seed.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Payload } from 'payload';

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'data',
);

interface SeedCategory {
  name: string;
  slug: string;
  parentSlug: string | null;
  icon?: string;
}

export interface Tally {
  created: number;
  existing: number;
}

export type Log = (message: string) => void;

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), 'utf-8')) as T;
}

// Creates every category that does not exist yet (by slug), parents before
// their children. Existing categories are left as they are. Returns each
// slug's id.
export async function seedCategories(
  payload: Payload,
  log: Log = () => {},
): Promise<{ ids: Map<string, number>; tally: Tally }> {
  const categories = await readJson<SeedCategory[]>('categories.json');
  const ids = new Map<string, number>();
  const tally: Tally = { created: 0, existing: 0 };

  let remaining = [...categories];
  while (remaining.length > 0) {
    const next: SeedCategory[] = [];
    for (const category of remaining) {
      const parent = category.parentSlug
        ? ids.get(category.parentSlug)
        : undefined;
      if (category.parentSlug && parent === undefined) {
        next.push(category);
        continue;
      }

      const { docs } = await payload.find({
        collection: 'categories',
        where: { slug: { equals: category.slug } },
        limit: 1,
        depth: 0,
      });
      if (docs[0]) {
        ids.set(category.slug, docs[0].id);
        tally.existing += 1;
        continue;
      }

      const created = await payload.create({
        collection: 'categories',
        data: {
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          ...(parent !== undefined ? { parent } : {}),
        },
      });
      ids.set(category.slug, created.id);
      tally.created += 1;
      log(`category ${category.slug}`);
    }

    if (next.length === remaining.length) {
      throw new Error(
        `Categories with missing parents: ${next.map((c) => `${c.slug} (parent ${c.parentSlug})`).join(', ')}`,
      );
    }
    remaining = next;
  }

  return { ids, tally };
}

// Sets the footer from data/footer.json. Without `overwrite`, only a footer
// that has never been filled in, so edits made in the admin panel stay.
export async function seedFooter(
  payload: Payload,
  { overwrite = false }: { overwrite?: boolean } = {},
): Promise<'set' | 'kept'> {
  if (!overwrite) {
    const current = await payload.findGlobal({ slug: 'footer', depth: 0 });
    if (current.description || (current.linkColumns?.length ?? 0) > 0) {
      return 'kept';
    }
  }
  await payload.updateGlobal({
    slug: 'footer',
    data: await readJson('footer.json'),
  });
  return 'set';
}
