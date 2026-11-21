// backend/payload-cms/src/collections/Users.ts

import type {
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Access,
} from 'payload';
import { ValidationError } from 'payload';
import { env } from '../env';
import { preventDeletingLastAdmin } from '../hooks/deleteGuards';

// Matches the storefront login, which rejects shorter passwords.
export const MIN_PASSWORD_LENGTH = 8;

// Payload has no built-in password policy. The password is only present in
// the data when it is being set or changed.
const enforcePasswordLength: CollectionBeforeValidateHook = ({ data, req }) => {
  const password: unknown = data?.password;

  if (typeof password === 'string' && password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError({
      collection: 'users',
      errors: [
        {
          path: 'password',
          message: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`,
        },
      ],
      req,
    });
  }

  return data;
};

// The admin panel's first-user screen (POST /api/users/first-register) is
// open only while no account exists. Whatever role is submitted there, that
// account must be an administrator, or nobody could ever open the panel.
// Ordinary sign-ups (POST /api/users) are unaffected, so on an empty
// database the first shopper still becomes a customer.
const FIRST_REGISTER_PATH = /\/users\/first-register\/?$/;

const makeFirstRegisteredUserAdmin: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
}) => {
  if (operation === 'create' && FIRST_REGISTER_PATH.test(req.pathname ?? '')) {
    return { ...data, role: 'admin' };
  }

  return data;
};

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
  auth: {
    cookies: {
      // Sent only over https once the CMS is served over https.
      secure: env.PAYLOAD_PUBLIC_URL.startsWith('https://'),
      sameSite: 'Lax',
    },
    // Payload's defaults, stated explicitly: 5 failed logins lock the
    // account for 10 minutes.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  admin: {
    useAsTitle: 'email',
  },
  hooks: {
    beforeValidate: [enforcePasswordLength],
    beforeChange: [makeFirstRegisteredUserAdmin],
    beforeDelete: [preventDeletingLastAdmin],
  },
  access: {
    // Only administrators may enter the admin panel. Customers still
    // authenticate through the API for the storefront; this rule governs the
    // admin UI only.
    admin: ({ req: { user } }) => user?.role === 'admin',
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
