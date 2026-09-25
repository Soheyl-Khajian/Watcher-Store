// backend/payload-cms/src/endpoints/productsByCategory.ts

import type { Endpoint } from 'payload';
import type { PayloadRequest } from 'payload';
import type { Category } from '../payload-types';

const findAllDescendantIds = (
  allCategories: Category[],
  parentId: number,
): number[] => {
  const children = allCategories.filter((cat) => {
    const pID = typeof cat.parent === 'object' ? cat.parent?.id : cat.parent;
    return pID === parentId;
  });

  let ids: number[] = children.map((cat) => cat.id);

  children.forEach((child) => {
    ids = [...ids, ...findAllDescendantIds(allCategories, child.id)];
  });
  return ids;
};

export const productsByCategoryEndpoint: Endpoint = {
  path: '/products-by-category/:slug',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!req.routeParams?.slug) {
      return Response.json(
        { message: 'Slug parameter is missing' },
        { status: 400 },
      );
    }
    const slug = req.routeParams.slug as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 15;

    try {
      const { docs: parentCategories } = await req.payload.find({
        collection: 'categories',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
        overrideAccess: false,
        req,
      });

      if (!parentCategories || parentCategories.length === 0) {
        return Response.json(
          { message: 'Category not found' },
          { status: 404 },
        );
      }

      const parentCategory = parentCategories[0];

      const { docs: allCategories } = await req.payload.find({
        collection: 'categories',
        limit: 1000,
        depth: 0,
        overrideAccess: false,
        req,
      });

      const descendantIds = findAllDescendantIds(
        allCategories,
        parentCategory.id,
      );
      const allCategoryIds = [parentCategory.id, ...descendantIds];

      const productsResult = await req.payload.find({
        collection: 'products',
        where: {
          categories: {
            in: allCategoryIds,
          },
          status: {
            equals: 'published',
          },
        },
        page,
        limit,
        depth: 1,
        overrideAccess: false,
        req,
      });

      return Response.json({ category: parentCategory, productsResult });
    } catch (error) {
      console.error(error);
      return Response.json(
        { message: 'Error fetching products' },
        { status: 500 },
      );
    }
  },
};
