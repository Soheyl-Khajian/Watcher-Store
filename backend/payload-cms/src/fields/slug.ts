// backend/payload-cms/src/fields/slug.ts
//
// The address part of a document (/products/<slug>, /blog/<slug>, ...).
// A slug typed by hand is normalised (lower case, words joined by dashes,
// no spaces or punctuation); an empty one is made from the document's
// name or title. Unique within its collection.

import type { TextField } from 'payload';
import { slugify } from '../utils/slugify';

export function slugField(from: string): TextField {
  return {
    name: 'slug',
    label: 'اسلاگ (برای URL)',
    type: 'text',
    required: true,
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description:
        'نشانی صفحه. اگر خالی بماند از روی عنوان ساخته می‌شود؛ فاصله‌ها و حروف بزرگ هنگام ذخیره یکدست می‌شوند.',
    },
    hooks: {
      beforeValidate: [
        ({ value, data }) => {
          if (typeof value === 'string' && value.trim()) {
            return slugify(value);
          }
          const source: unknown = data?.[from];
          return typeof source === 'string' && source.trim()
            ? slugify(source)
            : value;
        },
      ],
    },
  };
}
