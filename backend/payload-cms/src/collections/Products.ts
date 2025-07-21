import type { CollectionConfig } from 'payload'

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
    {
      name: 'name',
      label: 'نام محصول',
      type: 'text',
      required: true,
    },
    {
      name: 'price',
      label: 'قیمت',
      type: 'number',
      required: true,
    },
    {
      name: 'categories',
      label: 'دسته‌بندی‌ها',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
    },
  ],
}
