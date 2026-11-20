// backend/payload-cms/src/endpoints/productsByCategory.ts

import type { Endpoint, PayloadRequest } from 'payload';
import { collectCategoryIds, findAllCategories } from '../utils/categoryTree';

const DEFAULT_LIMIT = 15;
// A public endpoint: without a cap one request could load the whole catalog
// with its relationships.
export const MAX_LIMIT = 48;
const MAX_PAGE = 1000;

// Reads a positive integer query parameter. Anything else (missing,
// repeated, negative, fractional, or trailing characters) yields the
// fallback, and values above max are clamped.
function readPositiveInt(
  value: unknown,
  fallback: number,
  max: number,
): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export const productsByCategoryEndpoint: Endpoint = {
  path: '/products-by-category/:slug',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const slug = req.routeParams?.slug;

    if (typeof slug !== 'string' || slug.length === 0) {
      return Response.json(
        { message: 'Slug parameter is missing' },
        { status: 400 },
      );
    }

    const page = readPositiveInt(req.query.page, 1, MAX_PAGE);
    const limit = readPositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);

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

      const parentCategory = parentCategories[0];

      if (!parentCategory) {
        return Response.json(
          { message: 'Category not found' },
          { status: 404 },
        );
      }

      const allCategories = await findAllCategories(req);
      const categoryIds = collectCategoryIds(allCategories, parentCategory.id);

      const productsResult = await req.payload.find({
        collection: 'products',
        where: {
          categories: {
            in: categoryIds,
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
      req.payload.logger.error({
        err: error,
        msg: 'Failed to fetch products by category',
      });
      return Response.json(
        { message: 'Error fetching products' },
        { status: 500 },
      );
    }
  },
};
