// src/collections/Users.ts
import type { CollectionConfig, Access } from 'payload'

const isSelfOrAdmin: Access = ({ req: { user } }) => {
  // اگر کاربر لاگین نکرده، اجازه ندارد
  if (!user) {
    return false
  }

  // اگر نقش کاربر 'admin' است، اجازه کامل دارد
  if (user.role === 'admin') {
    return true
  }

  // در غیر این صورت، فقط به اطلاعات خودش دسترسی دارد
  return {
    id: {
      equals: user.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  // auth: true به تنهایی کافیست تا قابلیت‌های احراز هویت فعال شوند
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // هر کسی می‌تواند یک کاربر جدید (مشتری) بسازد
    create: () => true,
    // فقط خود کاربر یا ادمین می‌تواند اطلاعات را بخواند
    read: isSelfOrAdmin,
    // فقط خود کاربر یا ادمین می‌تواند اطلاعات را ویرایش کند
    update: isSelfOrAdmin,
    // فقط ادمین می‌تواند حذف کند
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'role',
      label: 'نقش',
      type: 'select',
      required: true,
      options: [
        { label: 'مدیر', value: 'admin' },
        { label: 'مشتری', value: 'customer' },
      ],
      defaultValue: 'customer',
      // دسترسی به این فیلد را محدود می‌کنیم
      access: {
        // فقط ادمین‌ها می‌توانند نقش را ببینند
        read: ({ req: { user } }) => user?.role === 'admin',
        // فقط ادمین‌ها می‌توانند نقش را تعیین کنند
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
