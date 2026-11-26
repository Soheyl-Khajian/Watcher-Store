// backend/payload-cms/src/collections/Categories.ts

import type { CollectionConfig, PayloadRequest } from 'payload';
import { slugField } from '../fields/slug';
import { applyPriceAdjustmentHandler } from '../endpoints/applyPriceAdjustmentHandler';
import {
  revalidateAfterChange,
  revalidateAfterDelete,
} from '../hooks/revalidateStorefront';

// The deepest category tree followed when checking a parent.
const MAX_TREE_DEPTH = 50;

// A category may not sit under itself or under one of its own
// subcategories: the tree would become a loop, and menus and breadcrumbs
// that walk up it would never end.
async function validateParent(
  value: unknown,
  { id, req }: { id?: number | string; req: PayloadRequest },
): Promise<true | string> {
  if (value === null || value === undefined || value === '' || !id) {
    return true;
  }
  let current: unknown =
    typeof value === 'object' ? (value as { id?: unknown }).id : value;
  for (let step = 0; step < MAX_TREE_DEPTH && current; step += 1) {
    if (String(current) === String(id)) {
      return 'دسته نمی‌تواند زیرمجموعه خودش یا زیرمجموعه‌های خودش باشد.';
    }
    const parent = await req.payload.findByID({
      collection: 'categories',
      id: current as number | string,
      depth: 0,
      disableErrors: true,
      req,
    });
    current =
      parent && typeof parent.parent === 'object' && parent.parent !== null
        ? parent.parent.id
        : parent?.parent;
  }
  return true;
}

export const Categories: CollectionConfig = {
  slug: 'categories',
  // Refresh the storefront's cached copy after edits.
  hooks: {
    afterChange: [revalidateAfterChange('categories', 'products')],
    afterDelete: [revalidateAfterDelete('categories', 'products')],
  },
  admin: {
    useAsTitle: 'name',
    components: {
      edit: {
        // The category price tool, before the save button (path from src/).
        beforeDocumentControls: ['/components/ApplyPriceChangeButton'],
      },
    },
  },
  endpoints: [
    {
      path: '/:id/apply-price-adjustment',
      method: 'post',
      handler: applyPriceAdjustmentHandler,
    },
  ],
  access: {
    read: () => true,
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
      name: 'icon',
      label: 'نام آیکون (از Lucide)',
      type: 'text',
      admin: {
        description: 'نام آیکون را از سایت lucide.dev کپی کنید. مثال: Camera',
      },
    },
    slugField('name'),
    {
      name: 'parent',
      label: 'دسته مادر (والد)',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
      validate: validateParent,
      filterOptions: ({ id }) => {
        if (id) {
          return {
            id: {
              not_equals: id,
            },
          };
        }
        return true;
      },
    },
    {
      name: 'image',
      label: 'تصویر دسته‌بندی',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'priceAdjustment',
      label: 'تغییر قیمت گروهی',
      type: 'group',
      admin: {
        description:
          'این تنظیمات برای اعمال تخفیف یا افزایش قیمت روی تمام محصولات این دسته است.',
        position: 'sidebar',
      },
      fields: [
        {
          name: 'adjustmentType',
          label: 'نوع تغییر',
          type: 'select',
          options: [
            { label: 'درصد تخفیف', value: 'discount' },
            { label: 'درصد افزایش', value: 'increase' },
          ],
        },
        {
          name: 'adjustmentValue',
          label: 'مقدار (درصد)',
          type: 'number',
          min: 0,
          max: 100,
          // A 100% discount would give products away.
          validate: (
            value: unknown,
            { siblingData }: { siblingData: unknown },
          ) =>
            (siblingData as { adjustmentType?: string } | undefined)
              ?.adjustmentType === 'discount' &&
            typeof value === 'number' &&
            value >= 100
              ? 'درصد تخفیف باید کمتر از ۱۰۰ باشد.'
              : true,
        },
      ],
    },
  ],
};
