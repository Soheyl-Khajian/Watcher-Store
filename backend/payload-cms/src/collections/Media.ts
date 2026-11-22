// src/collections/Media.ts

import type { CollectionConfig } from 'payload';
import { preventDeletingUsedMedia } from '../hooks/deleteGuards';
import {
  revalidateAfterChange,
  revalidateAfterDelete,
} from '../hooks/revalidateStorefront';

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    beforeDelete: [preventDeletingUsedMedia],
    afterChange: [revalidateAfterChange('products', 'posts', 'pages')],
    afterDelete: [revalidateAfterDelete('products', 'posts', 'pages')],
  },
  admin: {
    description: 'فایل‌های رسانه‌ای مانند تصاویر محصولات',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  upload: {
    // فقط پوشه ذخیره‌سازی را مشخص می‌کنیم. Payload بقیه موارد را مدیریت می‌کند.
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 480,
        height: 320,
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
      },
    ],
    adminThumbnail: 'thumbnail',
    // Raster images only. SVG is excluded because it can carry scripts and
    // media is served from the CMS's own origin, where the admin session
    // lives. (File size is limited globally in payload.config.ts.)
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  fields: [
    {
      name: 'alt',
      label: 'متن جایگزین (Alt Text)',
      type: 'text',
      required: true,
    },
  ],
};
