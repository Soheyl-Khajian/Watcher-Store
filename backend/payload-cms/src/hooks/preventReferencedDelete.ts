// backend/payload-cms/src/hooks/preventReferencedDelete.ts
//
// Some relationships are required (a post's author and thumbnail, a product
// gallery image) but their database links use ON DELETE SET NULL. Deleting
// a document that is still referenced there would fail inside the database
// with an unhelpful error. These hooks refuse such deletes up front with a
// 409 that names what still uses the document.

import { APIError } from 'payload';
import type {
  CollectionBeforeDeleteHook,
  PayloadRequest,
  Where,
} from 'payload';

interface Reference {
  collection: 'posts' | 'products';
  where: (id: number | string) => Where;
  titleField: 'title' | 'name';
  label: string;
}

const MAX_LISTED = 3;

async function findUses(
  req: PayloadRequest,
  id: number | string,
  references: Reference[],
): Promise<string[]> {
  const uses: string[] = [];

  for (const reference of references) {
    const result = await req.payload.find({
      collection: reference.collection,
      where: reference.where(id),
      limit: MAX_LISTED,
      depth: 0,
      req,
    });

    if (result.totalDocs === 0) {
      continue;
    }

    const titles = result.docs
      .map(
        (doc) =>
          `«${String((doc as unknown as Record<string, unknown>)[reference.titleField])}»`,
      )
      .join('، ');
    const more =
      result.totalDocs > MAX_LISTED
        ? ` و ${new Intl.NumberFormat('fa-IR').format(result.totalDocs - MAX_LISTED)} مورد دیگر`
        : '';

    uses.push(`${reference.label}: ${titles}${more}`);
  }

  return uses;
}

function preventDeleteWhileUsed(
  subject: string,
  advice: string,
  references: Reference[],
): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const uses = await findUses(req, id, references);

    if (uses.length > 0) {
      throw new APIError(
        `${subject} در حال استفاده است و حذف نمی‌شود (${uses.join('؛ ')}). ${advice}`,
        409,
        null,
        true,
      );
    }
  };
}

export const preventDeletingAuthors = preventDeleteWhileUsed(
  'این کاربر',
  'ابتدا نویسنده این نوشته‌ها را تغییر دهید.',
  [
    {
      collection: 'posts',
      where: (id) => ({ author: { equals: id } }),
      titleField: 'title',
      label: 'نویسنده نوشته‌های',
    },
  ],
);

export const preventDeletingUsedMedia = preventDeleteWhileUsed(
  'این تصویر',
  'ابتدا تصویر دیگری جایگزین آن کنید.',
  [
    {
      collection: 'posts',
      where: (id) => ({ thumbnail: { equals: id } }),
      titleField: 'title',
      label: 'تصویر شاخص نوشته‌های',
    },
    {
      collection: 'products',
      where: (id) => ({ 'gallery.image': { equals: id } }),
      titleField: 'name',
      label: 'گالری محصولات',
    },
  ],
);
