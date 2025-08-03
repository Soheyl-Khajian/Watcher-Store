// مسیر فایل: backend/payload-cms/src/collections/Products.ts

import type { CollectionConfig } from 'payload'
import { slateEditor } from '@payloadcms/richtext-slate'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // تب اول: اطلاعات اصلی و رسانه
        {
          label: 'اطلاعات اصلی و رسانه',
          fields: [
            // ... فیلدهای نام، کد کالا، گالری، نقد و بررسی ...
            {
              name: 'name',
              label: 'نام کامل محصول (برند + مدل)',
              type: 'text',
              required: true,
            },
            {
              name: 'sku',
              label: 'کد کالا (SKU)',
              type: 'text',
              required: true,
              unique: true,
            },
            {
              name: 'gallery',
              label: 'گالری تصاویر',
              type: 'array',
              minRows: 1,
              required: true,
              labels: {
                singular: 'تصویر',
                plural: 'تصاویر',
              },
              fields: [
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
              ],
            },
            {
              name: 'description',
              label: 'نقد و بررسی کامل',
              type: 'richText',
              editor: slateEditor({
                admin: {
                  elements: ['h2', 'h3', 'h4', 'link', 'ol', 'ul'],
                  leaves: ['bold', 'italic', 'underline'],
                },
              }),
            },
          ],
        },
        // تب دوم: مشخصات فنی
        {
          label: 'مشخصات فنی',
          fields: [
            {
              name: 'specifications',
              label: 'جدول مشخصات',
              type: 'array',
              labels: {
                singular: 'مشخصه',
                plural: 'مشخصات',
              },
              fields: [
                {
                  name: 'specName',
                  label: 'نام مشخصه',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
                {
                  name: 'specValue',
                  label: 'مقدار مشخصه',
                  type: 'text',
                  required: true,
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
        // تب سوم: قابلیت‌های هوشمند (با ساختار منعطف جدید)
        {
          label: 'ویژگی‌ها و قابلیت‌ها', // عنوان تب را عمومی‌تر کردیم
          fields: [
            {
              name: 'features',
              label: 'لیست ویژگی‌ها',
              type: 'array',
              labels: {
                singular: 'ویژگی',
                plural: 'ویژگی‌ها',
              },
              fields: [
                {
                  name: 'feature',
                  label: 'نام ویژگی',
                  type: 'text',
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
    // فیلدهای سایدبار
    {
      name: 'slug',
      label: 'اسلاگ (برای URL)',
      type: 'text',
      admin: { position: 'sidebar' },
      required: true,
      unique: true,
    },
    {
      name: 'status',
      label: 'وضعیت نمایش',
      type: 'select',
      options: ['published', 'draft'],
      defaultValue: 'draft',
      admin: { position: 'sidebar' },
    },
    {
      name: 'price',
      label: 'قیمت (تومان)',
      type: 'number',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'stock',
      label: 'موجودی انبار',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
    {
      name: 'categories',
      label: 'دسته‌بندی‌ها',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
  ],
}
