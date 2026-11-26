// backend/payload-cms/src/globals/Footer.ts

import type { GlobalConfig } from 'payload';
import { revalidateGlobalAfterChange } from '../hooks/revalidateStorefront';

// Links the storefront can show: web addresses, email and phone links, and
// addresses on the shop itself (starting with /). Anything else, such as
// javascript:, is refused here as well as dropped by the storefront.
export function validateFooterUrl(value: unknown): true | string {
  const url = typeof value === 'string' ? value.trim() : '';
  if (/^\/(?!\/)/.test(url) || /^(https?:\/\/|mailto:|tel:)\S+$/i.test(url)) {
    return true;
  }
  return 'نشانی باید با https://، mailto:، tel: یا / شروع شود.';
}

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'تنظیمات فوتر',
  // Refresh the storefront's cached footer after edits.
  hooks: {
    afterChange: [revalidateGlobalAfterChange('footer')],
  },
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
              validate: validateFooterUrl,
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
          validate: validateFooterUrl,
        },
      ],
    },
  ],
};
