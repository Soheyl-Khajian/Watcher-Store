import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // همه کاربران می‌توانند دسته‌بندی‌ها را مشاهده کنند
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
      label: 'دسته‌بندی والد',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'image',
      label: 'تصویر دسته‌بندی',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
