import type { CollectionConfig } from 'payload'
import { slateEditor } from '@payloadcms/richtext-slate'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    preview: (doc) => {
      if (doc?.slug) {
        return `${process.env.PAYLOAD_PUBLIC_SERVER_URL}/products/${doc.slug}`
      }
      return ''
    },
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
        // تب اول: اطلاعات اصلی
        {
          label: 'اطلاعات اصلی',
          fields: [
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
              name: 'description',
              label: 'نقد و بررسی کامل',
              type: 'richText',
              editor: slateEditor({
                admin: {
                  elements: [
                    'h1',
                    'h2',
                    'h3',
                    'h4',
                    'h5',
                    'h6',
                    'blockquote',
                    'link',
                    'ol',
                    'ul',
                    'textAlign',
                    'indent',
                  ],
                  leaves: ['bold', 'code', 'italic', 'strikethrough', 'underline'],
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
              name: 'resolution',
              label: 'رزولوشن تصویر',
              type: 'select',
              options: [
                '2MP',
                '4MP',
                '5MP',
                '6MP',
                '8MP',
                '8x2MP (پانورامیک)',
                '4x2MP (پانورامیک)',
                '3x2MP (پانورامیک)',
                '2MP Full HD',
              ],
            },
            {
              name: 'lensType',
              label: 'نوع لنز',
              type: 'select',
              options: ['ثابت', 'وری‌فوکال', 'موتورایز', 'اپتیکال'],
            },
            // --- فیلد جدید ---
            {
              name: 'focalLength',
              label: 'لنز (فاصله کانونی)',
              type: 'text',
              admin: { placeholder: 'مثال: 2.8mm یا 2.7-13.5mm' },
            },
            // --- فیلد جدید ---
            {
              name: 'wdr',
              label: 'WDR (نوع/dB)',
              type: 'text',
              admin: { placeholder: 'مثال: WDR 120db' },
            },
            {
              name: 'nightVisionRange',
              label: 'برد دید در شب (متر)',
              type: 'number',
            },
            {
              name: 'nightVisionType',
              label: 'نوع دید در شب',
              type: 'select',
              options: [
                'IR',
                'Warm Light',
                'Warm Light/IR',
                'نور دوگانه هوشمند',
                'نور دوگانه فعال/گرم',
              ],
            },
            {
              name: 'ipRating',
              label: 'استاندارد مقاومت (IP)',
              type: 'text',
              admin: { placeholder: 'مثال: IP67' },
            },
          ],
        },
        // تب سوم: قابلیت‌های هوشمند
        {
          label: 'قابلیت‌های هوشمند',
          fields: [
            {
              name: 'hasMicrophone',
              label: 'دارای میکروفون داخلی',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'supportsSDCard',
              label: 'پشتیبانی از کارت حافظه',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'isPoE',
              label: 'قابلیت PoE',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'isStarlight',
              label: 'قابلیت Starlight / Full-Color',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
      ],
    },
    // فیلدهایی که در سایدبار نمایش داده می‌شوند
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
      name: 'status',
      label: 'وضعیت نمایش',
      type: 'select',
      options: [
        { label: 'منتشر شده', value: 'published' },
        { label: 'پیش‌نویس', value: 'draft' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'price',
      label: 'قیمت (تومان)',
      type: 'number',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'stock',
      label: 'موجودی انبار',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'thumbnail',
      label: 'تصویر شاخص',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'categories',
      label: 'دسته‌بندی‌ها',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
