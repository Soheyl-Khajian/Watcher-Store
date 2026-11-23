import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { DEMO_IMAGES_DIR, demoSeedAllowed } from '../src/seed/demo';
import { IMAGE_ALT, POSTS, PRODUCTS } from '../src/seed/demoData';

interface Credit {
  file: string;
  source: string;
  author: string;
  license: string;
}

const credits = JSON.parse(
  readFileSync(join(DEMO_IMAGES_DIR, 'credits.json'), 'utf-8'),
) as Credit[];

const categories = JSON.parse(
  readFileSync(join(__dirname, '../src/seed/data/categories.json'), 'utf-8'),
) as Array<{ slug: string }>;

const usedImages = new Set([
  ...PRODUCTS.flatMap((product) => product.images),
  ...POSTS.map((post) => post.thumbnail),
]);

describe('demo data', () => {
  it('has a photo file, alt text and a credit for every image it uses', () => {
    for (const name of usedImages) {
      expect(existsSync(join(DEMO_IMAGES_DIR, `${name}.webp`)), name).toBe(
        true,
      );
      expect(IMAGE_ALT[name], name).toBeTruthy();
      expect(
        credits.some((c) => c.file === `${name}.webp`),
        name,
      ).toBe(true);
    }
  });

  it('ships no photo without a credit', () => {
    const files = readdirSync(DEMO_IMAGES_DIR).filter((f) =>
      f.endsWith('.webp'),
    );
    for (const file of files) {
      expect(
        credits.some((c) => c.file === file),
        file,
      ).toBe(true);
    }
  });

  it('credits every photo with an open license and its source', () => {
    for (const credit of credits) {
      expect(credit.license, credit.file).toMatch(
        /^(CC0|Public domain|CC BY(-SA)? [234]\.\d)$/,
      );
      expect(credit.source, credit.file).toMatch(
        /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/,
      );
      expect(credit.author, credit.file).toBeTruthy();
    }
  });

  it('puts products only in categories that exist', () => {
    const slugs = new Set(categories.map((c) => c.slug));
    for (const product of PRODUCTS) {
      for (const slug of product.categories) {
        expect(slugs.has(slug), `${product.slug}: ${slug}`).toBe(true);
      }
    }
  });

  it('has unique product slugs and SKUs, and valid prices', () => {
    expect(new Set(PRODUCTS.map((p) => p.slug)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.sku)).size).toBe(PRODUCTS.length);
    for (const product of PRODUCTS) {
      if (product.salePrice !== undefined) {
        expect(product.salePrice, product.slug).toBeLessThan(product.price);
      }
      expect(product.stock, product.slug).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('demoSeedAllowed', () => {
  it('runs outside production', () => {
    expect(demoSeedAllowed({ NODE_ENV: 'development' })).toBe(true);
    expect(demoSeedAllowed({})).toBe(true);
  });

  it('refuses production unless explicitly allowed', () => {
    expect(demoSeedAllowed({ NODE_ENV: 'production' })).toBe(false);
    expect(
      demoSeedAllowed({ NODE_ENV: 'production', ALLOW_DEMO_SEED: 'yes' }),
    ).toBe(false);
    expect(
      demoSeedAllowed({ NODE_ENV: 'production', ALLOW_DEMO_SEED: 'true' }),
    ).toBe(true);
  });
});
