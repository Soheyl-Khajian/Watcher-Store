// backend/payload-cms/src/collections/Pages.ts

import type { CollectionConfig } from 'payload';
import { slugField } from '../fields/slug';
import { readPublishedOrAdmin } from '../access/readPublishedOrAdmin';
import { slateEditor } from '@payloadcms/richtext-slate';
import {
  revalidateAfterChange,
  revalidateAfterDelete,
} from '../hooks/revalidateStorefront';

export const Pages: CollectionConfig = {
  slug: 'pages',
  // Refresh the storefront's cached copy after edits.
  hooks: {
    afterChange: [revalidateAfterChange('pages')],
    afterDelete: [revalidateAfterDelete('pages')],
  },
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
    slugField('title'),
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
