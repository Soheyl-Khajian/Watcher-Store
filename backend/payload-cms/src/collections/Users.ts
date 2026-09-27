// backend/payload-cms/src/collections/Users.ts

import type { CollectionConfig, Access } from 'payload';

const isSelfOrAdmin: Access = ({ req: { user } }) => {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return {
    id: {
      equals: user.id,
    },
  };
};

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true, // auth: true alone is enough to enable authentication features
  admin: {
    useAsTitle: 'email',
  },
  access: {
    create: () => true,
    read: isSelfOrAdmin,
    update: isSelfOrAdmin,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'displayName',
      label: 'نام نمایشی عمومی',
      type: 'text',
      required: true,
      defaultValue: 'Watcher Store Team',
      admin: {
        position: 'sidebar',
        description:
          'این نام در محتوای عمومی مانند مقالات نمایش داده می‌شود. از آدرس ایمیل استفاده نکنید.',
      },
      access: {
        read: ({ req: { user } }) => Boolean(user),
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
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
      access: {
        read: ({ req: { user } }) => user?.role === 'admin',
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
};
