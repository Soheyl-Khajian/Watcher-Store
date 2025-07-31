// src/collections/Media.ts

import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
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
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      label: 'متن جایگزین (Alt Text)',
      type: 'text',
      required: true,
    },
  ],
}
