// backend/payload-cms/src/collections/Pages.ts

import type { CollectionConfig } from 'payload';
import { readPublishedOrAdmin } from '../access/readPublishedOrAdmin';
import { slateEditor } from '@payloadcms/richtext-slate';
import { slugify } from '../utils/slugify';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
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
      label: 'عنوان صفحه',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      label: 'محتوای صفحه',
      type: 'richText',
      editor: slateEditor({
        admin: {
          elements: ['h2', 'h3', 'h4', 'link', 'ol', 'ul'],
          leaves: ['bold', 'italic', 'underline'],
        },
      }),
    },
    {
      name: 'slug',
      label: 'اسلاگ (برای URL)',
      type: 'text',
      admin: {
        position: 'sidebar',
        description:
          'این فیلد به صورت خودکار از روی عنوان ساخته می‌شود، اما می‌توانید آن را ویرایش کنید.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) {
              return slugify(value); // clear if it was manual
            }
            if (data?.title) {
              return slugify(data.title); // build from title if empty
            }
            return value;
          },
        ],
      },
      unique: true,
      index: true,
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        {
          label: 'پیش‌نویس',
          value: 'draft',
        },
        {
          label: 'منتشر شده',
          value: 'published',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
};
