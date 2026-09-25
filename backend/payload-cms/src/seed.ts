// backend/payload-cms/src/seed.ts
import { getPayload } from 'payload';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import configPromise from './payload.config';
import type { Payload } from 'payload';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeedCategory {
  name: string;
  slug: string;
  parentSlug: string | null;
  icon?: string;
}

const upsertDoc = async (
  payload: Payload,
  collection: 'categories',
  query: any,
  data: any,
) => {
  const { docs } = await payload.find({ collection, where: query, limit: 1 });
  if (docs.length > 0) {
    console.log(
      `ℹ️ Document in collection '${collection}' with query ${JSON.stringify(query)} already exists. Skipping.`,
    );
    return docs[0];
  }
  console.log(`Creating new document in collection '${collection}'...`);
  const newDoc = await payload.create({ collection, data });
  console.log(`✅ New document created successfully.`);
  return newDoc;
};

const seed = async () => {
  console.log('Preparing Payload for seeding...');
  const payload = await getPayload({
    config: await configPromise,
  });
  console.log('Payload is ready. Starting seeding process...');

  try {
    const categoriesData: SeedCategory[] = JSON.parse(
      await fs.readFile(
        path.resolve(__dirname, '../seed-categories.json'),
        'utf-8',
      ),
    );
    const slugToIdMap = new Map();
    let remainingCategories = [...categoriesData];
    let progressMade = true;

    console.log('\nProcessing category hierarchy...');

    while (remainingCategories.length > 0 && progressMade) {
      progressMade = false;
      const nextRemaining: SeedCategory[] = [];

      for (const cat of remainingCategories) {
        if (!cat.parentSlug) {
          const newCat = await upsertDoc(
            payload,
            'categories',
            { slug: { equals: cat.slug } },
            { name: cat.name, slug: cat.slug, icon: cat.icon },
          );
          slugToIdMap.set(newCat.slug, newCat.id);
          progressMade = true;
        } else {
          const parentId = slugToIdMap.get(cat.parentSlug);
          if (parentId) {
            const newCat = await upsertDoc(
              payload,
              'categories',
              { slug: { equals: cat.slug } },
              {
                name: cat.name,
                slug: cat.slug,
                parent: parentId,
                icon: cat.icon,
              },
            );
            slugToIdMap.set(newCat.slug, newCat.id);
            progressMade = true;
          } else {
            nextRemaining.push(cat);
          }
        }
      }
      remainingCategories = nextRemaining;
    }

    if (remainingCategories.length > 0) {
      remainingCategories.forEach((cat) =>
        console.warn(
          `⚠️ Parent with slug '${cat.parentSlug}' for category '${cat.name}' was never found.`,
        ),
      );
    }
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  }

  try {
    console.log('\nUpdating footer data...');
    const footerData = JSON.parse(
      await fs.readFile(
        path.resolve(__dirname, '../seed-footer.json'),
        'utf-8',
      ),
    );
    await payload.updateGlobal({
      slug: 'footer',
      data: footerData,
    });
    console.log('✅ Footer data updated successfully.');
  } catch (error) {
    console.error('❌ Error seeding footer data:', error);
  }

  console.log('\nSeeding process completed.');
  process.exit(0);
};

seed();
