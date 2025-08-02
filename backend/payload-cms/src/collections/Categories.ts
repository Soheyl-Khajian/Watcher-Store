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
      label: 'دسته مادر (والد)',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      filterOptions: ({ id }) => {
        // اگر در حال ویرایش هستیم، فیلتر را اعمال می‌کنیم
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
  ],
}
