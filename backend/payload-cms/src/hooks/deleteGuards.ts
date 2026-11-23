// backend/payload-cms/src/hooks/deleteGuards.ts
//
// Guards that refuse a delete up front with a clear 409 instead of letting it
// fail inside the database or leave the store unmanageable:
// - an image still used where one is required (a post thumbnail, a product
//   gallery image): those links are NOT NULL with ON DELETE SET NULL, so the
//   database would reject the delete with an unhelpful error
// - the last administrator, without whom nobody could manage the store
//   (preventDemotingLastAdmin refuses the same outcome by a role change)
//
// Writers are deliberately not guarded: deleting one clears the post's
// author link and the post keeps its byline (see Posts).

import { APIError } from 'payload';
import type {
  CollectionBeforeChangeHook,
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

export const preventDeletingLastAdmin: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const user = await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    disableErrors: true,
    req,
  });

  if (user?.role !== 'admin') {
    return;
  }

  const { totalDocs: admins } = await req.payload.count({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    req,
  });

  if (admins <= 1) {
    throw new APIError(
      'این آخرین مدیر فروشگاه است و حذف نمی‌شود. ابتدا مدیر دیگری بسازید.',
      409,
      null,
      true,
    );
  }
};

// Changing the last administrator's role would lock everyone out of the
// admin panel just as surely as deleting them: Payload lets only
// administrators in, and the first-user screen closes once any account
// exists.
export const preventDemotingLastAdmin: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (
    operation !== 'update' ||
    originalDoc?.role !== 'admin' ||
    data.role === undefined ||
    data.role === 'admin'
  ) {
    return data;
  }

  const { totalDocs: otherAdmins } = await req.payload.count({
    collection: 'users',
    where: {
      and: [
        { role: { equals: 'admin' } },
        { id: { not_equals: originalDoc.id } },
      ],
    },
    req,
  });

  if (otherAdmins === 0) {
    throw new APIError(
      'این آخرین مدیر فروشگاه است و نقش او تغییر نمی‌کند. ابتدا مدیر دیگری بسازید.',
      409,
      null,
      true,
    );
  }

  return data;
};
