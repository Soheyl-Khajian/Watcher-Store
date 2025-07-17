import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
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
      label: 'نام دسته‌بندی',
      type: 'text',
      required: true,
    },
  ],
}
