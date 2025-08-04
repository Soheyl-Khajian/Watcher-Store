// مسیر فایل: backend/payload-cms/src/collections/Categories.ts

import type { CollectionConfig } from 'payload'
import { applyPriceAdjustmentHandler } from '../endpoints/applyPriceAdjustmentHandler'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    // این ساختار صحیح بر اساس مستندات است
    components: {
      edit: {
        // این جایگاه، کامپوننت ما را قبل از دکمه‌های "ذخیره" و "انتشار" قرار می‌دهد
        beforeDocumentControls: [
          // مسیر فایل کامپوننت از ریشه پوشه src در نظر گرفته می‌شود
          '/components/ApplyPriceChangeButton',
        ],
      },
    },
  },
  endpoints: [
    {
      path: '/:id/apply-price-adjustment',
      method: 'post',
      handler: applyPriceAdjustmentHandler, // <-- ارجاع به تابع وارد شده
    },
  ],
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      label: 'نام دسته‌بندی',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'اسلاگ (برای URL)',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
      required: true,
      unique: true,
    },
    {
      name: 'parent',
      label: 'دسته مادر (والد)',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      filterOptions: ({ id }) => {
        if (id) {
          return {
            id: {
              not_equals: id,
            },
          }
        }
        return true
      },
    },
    {
      name: 'image',
      label: 'تصویر دسته‌بندی',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'priceAdjustment',
      label: 'تغییر قیمت گروهی',
      type: 'group',
      admin: {
        description: 'این تنظیمات برای اعمال تخفیف یا افزایش قیمت روی تمام محصولات این دسته است.',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'adjustmentType',
          label: 'نوع تغییر',
          type: 'select',
          options: [
            { label: 'درصد تخفیف', value: 'discount' },
            { label: 'درصد افزایش', value: 'increase' },
          ],
        },
        {
          name: 'adjustmentValue',
          label: 'مقدار (درصد)',
          type: 'number',
          min: 0,
          max: 100,
        },
      ],
    },
  ],
}
