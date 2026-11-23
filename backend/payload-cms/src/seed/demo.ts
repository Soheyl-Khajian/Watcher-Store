// backend/payload-cms/src/seed/demo.ts
//
// A complete demo store: categories and footer, products with photos, blog
// posts, the about/contact/terms pages, an image-credits page, and
// optionally a demo administrator and a demo customer.
//
// Safe to run again: everything is looked up first (products, posts and
// pages by slug, photos by file name, accounts by email) and only what is
// missing is created. Nothing that exists is changed, so edits made in the
// admin panel, and the store's own products and accounts, are left alone.

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Payload } from 'payload';
import { ensureAdmin } from '../utils/ensureAdmin';
import {
  seedCategories,
  seedFooter,
  type Log,
  type Tally,
} from './catalogBasics';
import {
  CREDITS_PAGE,
  IMAGE_ALT,
  PAGES,
  POSTS,
  PRODUCTS,
  type DemoPage,
} from './demoData';
import { h2, link, p, ul, type RichTextNode } from './richText';

export const DEMO_IMAGES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'demo-images',
);

export const DEMO_AUTHOR_NAME = 'تیم فروشگاه واچر';

export interface DemoAccount {
  email: string;
  password: string;
  displayName?: string;
}

export interface SeedDemoOptions {
  admin?: DemoAccount;
  customer?: DemoAccount;
  imagesDir?: string;
  log?: Log;
}

export interface SeedDemoResult {
  categories: Tally;
  footer: 'set' | 'kept';
  media: Tally;
  products: Tally;
  posts: Tally;
  pages: Tally;
  admin: 'created' | 'exists' | 'promoted' | 'skipped';
  customer: 'created' | 'exists' | 'skipped';
}

interface Credit {
  file: string;
  title: string;
  source: string;
  author: string;
  license: string;
  licenseUrl?: string;
}

const tally = (): Tally => ({ created: 0, existing: 0 });

// Whether the demo seed may run here: anywhere but production, and in
// production only when explicitly allowed (a demo deployment).
export function demoSeedAllowed(
  env: Record<string, string | undefined>,
): boolean {
  return env.NODE_ENV !== 'production' || env.ALLOW_DEMO_SEED === 'true';
}

async function findOneBy(
  payload: Payload,
  collection: 'products' | 'posts' | 'pages' | 'media' | 'users',
  field: string,
  value: string,
) {
  const { docs } = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return docs[0] as { id: number; role?: string } | undefined;
}

function creditsPage(credits: Credit[]): RichTextNode[] {
  return [
    p(
      'عکس‌های محصولات و مقاله‌های این فروشگاه نمایشی از ',
      link('https://commons.wikimedia.org/', 'ویکی‌مدیا کامانز', true),
      ' برداشته شده‌اند و هر کدام با مجوز آزاد منتشر شده‌اند (مالکیت عمومی، CC0، یا Creative Commons با ذکر منبع). عکس‌ها فقط تغییر اندازه داده شده‌اند. محصولات این فروشگاه، محصولات واقعی سازندگان این تجهیزات نیستند.',
    ),
    h2('فهرست تصاویر'),
    ul(
      ...credits.map((credit) => [
        link(credit.source, credit.title, true),
        ` — ${credit.author} — `,
        credit.licenseUrl
          ? link(credit.licenseUrl, credit.license, true)
          : credit.license,
      ]),
    ),
  ];
}

export async function seedDemo(
  payload: Payload,
  {
    admin,
    customer,
    imagesDir = DEMO_IMAGES_DIR,
    log = () => {},
  }: SeedDemoOptions = {},
): Promise<SeedDemoResult> {
  const result: SeedDemoResult = {
    categories: tally(),
    footer: 'kept',
    media: tally(),
    products: tally(),
    posts: tally(),
    pages: tally(),
    admin: 'skipped',
    customer: 'skipped',
  };

  // Categories and footer.
  const { ids: categoryIds, tally: categoryTally } = await seedCategories(
    payload,
    log,
  );
  result.categories = categoryTally;
  result.footer = await seedFooter(payload);

  // Accounts.
  if (admin) {
    result.admin = await ensureAdmin(payload, {
      displayName: DEMO_AUTHOR_NAME,
      ...admin,
    });
  }
  if (customer) {
    const existing = await findOneBy(payload, 'users', 'email', customer.email);
    if (existing) {
      result.customer = 'exists';
    } else {
      await payload.create({
        collection: 'users',
        data: {
          email: customer.email,
          password: customer.password,
          displayName: customer.displayName ?? 'مشتری نمایشی',
          role: 'customer',
        },
      });
      result.customer = 'created';
      log(`customer ${customer.email}`);
    }
  }
  const author = admin
    ? await findOneBy(payload, 'users', 'email', admin.email)
    : undefined;

  // Photos: uploaded once each, by file name.
  const mediaIds = new Map<string, number>();
  const uploadImage = async (name: string): Promise<number> => {
    const known = mediaIds.get(name);
    if (known !== undefined) return known;
    const filename = `${name}.webp`;
    const existing = await findOneBy(payload, 'media', 'filename', filename);
    if (existing) {
      result.media.existing += 1;
      mediaIds.set(name, existing.id);
      return existing.id;
    }
    const alt = IMAGE_ALT[name];
    if (!alt) throw new Error(`No alt text for demo image ${name}`);
    const created = await payload.create({
      collection: 'media',
      data: { alt },
      filePath: path.join(imagesDir, filename),
    });
    result.media.created += 1;
    mediaIds.set(name, created.id);
    log(`image ${filename}`);
    return created.id;
  };

  // Products.
  for (const product of PRODUCTS) {
    if (await findOneBy(payload, 'products', 'slug', product.slug)) {
      result.products.existing += 1;
      continue;
    }
    const gallery = [];
    for (const image of product.images) {
      gallery.push({ image: await uploadImage(image) });
    }
    const categories = product.categories.map((slug) => {
      const id = categoryIds.get(slug);
      if (id === undefined) throw new Error(`Unknown category ${slug}`);
      return id;
    });
    await payload.create({
      collection: 'products',
      data: {
        name: product.name,
        sku: product.sku,
        slug: product.slug,
        status: 'published',
        price: product.price,
        ...(product.salePrice
          ? { salePrice: product.salePrice, isOnSale: true }
          : {}),
        stock: product.stock,
        categories,
        gallery,
        description: product.description,
        specifications: product.specifications.map(([specName, specValue]) => ({
          specName,
          specValue,
        })),
        features: product.features.map((feature) => ({ feature })),
      },
    });
    result.products.created += 1;
    log(`product ${product.slug}`);
  }

  // Blog posts.
  for (const post of POSTS) {
    if (await findOneBy(payload, 'posts', 'slug', post.slug)) {
      result.posts.existing += 1;
      continue;
    }
    await payload.create({
      collection: 'posts',
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        status: 'published',
        publishedDate: post.publishedDate,
        thumbnail: await uploadImage(post.thumbnail),
        authorName: DEMO_AUTHOR_NAME,
        ...(author ? { author: author.id } : {}),
      },
    });
    result.posts.created += 1;
    log(`post ${post.slug}`);
  }

  // Pages, and the photo credits.
  const credits = JSON.parse(
    await fs.readFile(path.join(imagesDir, 'credits.json'), 'utf-8'),
  ) as Credit[];
  const pages: DemoPage[] = [
    ...PAGES,
    { ...CREDITS_PAGE, content: creditsPage(credits) },
  ];
  for (const page of pages) {
    if (await findOneBy(payload, 'pages', 'slug', page.slug)) {
      result.pages.existing += 1;
      continue;
    }
    await payload.create({
      collection: 'pages',
      data: {
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: 'published',
      },
    });
    result.pages.created += 1;
    log(`page ${page.slug}`);
  }

  return result;
}
