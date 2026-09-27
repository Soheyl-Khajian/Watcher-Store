// backend/payload-cms/src/collections/Posts.ts

import type { CollectionConfig } from 'payload';
import type { CollectionBeforeChangeHook } from 'payload';
import { readPublishedOrAdmin } from '../access/readPublishedOrAdmin';
import { slateEditor } from '@payloadcms/richtext-slate';

const PUBLIC_AUTHOR_FALLBACK = 'Watcher Store Team';

function getRelationshipID(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;

    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }
  }

  return null;
}

const populateAuthorName: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const authorID = getRelationshipID(data.author ?? originalDoc?.author);

  if (!authorID) {
    return data;
  }

  const author = await req.payload.findByID({
    collection: 'users',
    id: authorID,
  });

  const displayName =
    typeof author.displayName === 'string' && author.displayName.trim()
      ? author.displayName.trim()
      : PUBLIC_AUTHOR_FALLBACK;

  return {
    ...data,
    authorName: displayName,
  };
};

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'authorName', 'status', 'publishedDate'],
  },
  hooks: {
    beforeChange: [populateAuthorName],
  },
  access: {
    read: readPublishedOrAdmin,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      label: 'عنوان مقاله',
      type: 'text',
      required: true,
    },
    {
      name: 'excerpt',
      label: 'خلاصه مطلب (Excerpt)',
      type: 'textarea',
      required: true,
      admin: {
        description: 'یک خلاصه کوتاه از مقاله برای نمایش در کارت‌ها.',
      },
    },
    {
      name: 'content',
      label: 'محتوای مقاله',
      type: 'richText',
      editor: slateEditor({
        admin: {
          elements: ['h2', 'h3', 'h4', 'link', 'ol', 'ul', 'upload'],
          leaves: ['bold', 'italic', 'underline'],
        },
      }),
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'published', label: 'منتشر شده' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedDate',
      label: 'تاریخ انتشار',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'author',
      label: 'نویسنده',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
      access: {
        read: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'authorName',
      label: 'نام نمایشی نویسنده',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'این مقدار از نام نمایشی کاربر نویسنده کپی می‌شود.',
      },
    },
    {
      name: 'thumbnail',
      label: 'تصویر شاخص',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'slug',
      label: 'اسلاگ (برای URL)',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
};
