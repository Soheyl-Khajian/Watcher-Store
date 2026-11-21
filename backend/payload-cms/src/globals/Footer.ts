// مسیر فایل: backend/payload-cms/src/globals/Footer.ts

import type { GlobalConfig } from 'payload';

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'تنظیمات فوتر',
  access: {
    read: () => true,
    // Without an explicit rule Payload lets any signed-in user update a
    // global, and anyone can register a customer account.
    update: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'description',
      label: 'متن توضیحات فوتر',
      type: 'textarea',
    },
    {
      name: 'linkColumns',
      label: 'ستون‌های لینک',
      type: 'array',
      minRows: 1,
      maxRows: 3,
      fields: [
        {
          name: 'title',
          label: 'عنوان ستون',
          type: 'text',
          required: true,
        },
        {
          name: 'links',
          label: 'لینک‌ها',
          type: 'array',
          fields: [
            {
              name: 'label',
              label: 'متن لینک',
              type: 'text',
              required: true,
            },
            {
              name: 'url',
              label: 'آدرس (URL)',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'socialLinks',
      label: 'شبکه‌های اجتماعی',
      type: 'array',
      fields: [
        {
          name: 'platform',
          label: 'پلتفرم',
          type: 'select',
          options: ['Instagram', 'Linkedin', 'Telegram'],
          required: true,
        },
        {
          name: 'url',
          label: 'آدرس (URL)',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
};
