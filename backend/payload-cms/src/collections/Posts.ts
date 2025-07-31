// backend/payload-cms/src/collections/Posts.ts
import type { CollectionConfig } from 'payload'
import { slateEditor } from '@payloadcms/richtext-slate'
import type { CollectionBeforeChangeHook } from 'payload'

// هوک به beforeChange تغییر کرده است
const populateAuthorName: CollectionBeforeChangeHook = async ({ data, req }) => {
  // اگر فیلد نویسنده وجود دارد
  if (data.author) {
    // اطلاعات کامل نویسنده را پیدا می‌کنیم
    const author = await req.payload.findByID({
      collection: 'users',
      id: data.author,
    })

    if (author) {
      // آبجکت دیتا را با افزودن نام نویسنده برمی‌گردانیم
      // تا در همان عملیات اولیه ذخیره شود
      return {
        ...data,
        authorName: author.email, // یا هر فیلد دیگری مثل نام کامل
      }
    }
  }

  // اگر تغییری نبود، همان داده اصلی را برگردان
  return data
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    // authorName را به ستون‌های پیش‌فرض برمی‌گردانیم
    defaultColumns: ['title', 'authorName', 'status', 'publishedDate'],
  },
  hooks: {
    // از هوک beforeChange استفاده می‌کنیم
    beforeChange: [populateAuthorName],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => user?.role === 'admin',
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      label: 'عنوان مقاله',
      type: 'text',
      required: true,
    },
    {
      name: 'content',
      label: 'محتوای مقاله',
      type: 'richText',
      editor: slateEditor({
        admin: {
          elements: ['h2', 'h3', 'h4', 'link', 'ol', 'ul', 'upload'],
          leaves: ['bold', 'italic', 'underline'],
        },
      }),
    },
    {
      name: 'status',
      label: 'وضعیت',
      type: 'select',
      options: [
        { value: 'draft', label: 'پیش‌نویس' },
        { value: 'published', label: 'منتشر شده' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'publishedDate',
      label: 'تاریخ انتشار',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'author',
      label: 'نویسنده',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    // فیلد authorName را دوباره فعال می‌کنیم
    {
      name: 'authorName',
      label: 'نام نویسنده',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'thumbnail',
      label: 'تصویر شاخص',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'slug',
      label: 'اسلاگ (برای URL)',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
