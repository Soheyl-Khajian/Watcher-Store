import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // همه کاربران می‌توانند دسته‌بندی‌ها را مشاهده کنند
    // create: () => true, // همه کاربران می‌توانند دسته‌بندی جدید ایجاد کنند
    // update: () => true, // همه کاربران می‌توانند دسته‌بندی‌ها را ویرایش کنند
    // delete: () => true, // همه کاربران می‌توانند دسته‌بندی‌ها را حذف کنند
  },
  fields: [
    // بخش اطلاعات اصلی
    {
      name: 'name',
      label: 'نام کامل محصول',
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

    // بخش محتوا
    {
      name: 'description',
      label: 'نقد و بررسی کامل',
      type: 'richText',
      editor: lexicalEditor({}),
    },

    // بخش قیمت و موجودی
    {
      name: 'price',
      label: 'قیمت (تومان)',
      type: 'number',
      required: true,
    },
    {
      name: 'stock',
      label: 'موجودی انبار',
      type: 'number',
      defaultValue: 0,
    },

    // بخش رسانه
    {
      name: 'thumbnail',
      label: 'تصویر شاخص',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'gallery',
      label: 'گالری تصاویر',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },

    // بخش دسته‌بندی و ویژگی‌ها
    {
      name: 'categories',
      label: 'دسته‌بندی‌ها',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
    {
      name: 'specifications',
      label: 'ویژگی‌های فنی (برای فیلتر)',
      type: 'group',
      fields: [
        {
          name: 'resolution',
          label: 'رزولوشن',
          type: 'select',
          options: ['2MP', '4MP', '5MP', '8MP (4K)'],
        },
        {
          name: 'nightVisionRange',
          label: 'برد دید در شب (متر)',
          type: 'number',
        },
        {
          name: 'ipRating',
          label: 'استاندارد مقاومت (IP)',
          type: 'text',
          admin: {
            placeholder: 'مثال: IP67',
          },
        },
      ],
    },
  ],
}
