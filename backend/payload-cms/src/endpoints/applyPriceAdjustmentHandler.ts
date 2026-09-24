// backend/payload-cms/src/endpoints/applyPriceAdjustmentHandler.ts

import type { PayloadRequest } from 'payload';
import type { Category, Product } from '../payload-types';

const PAGE_SIZE = 100;

type AdjustmentAction = 'apply' | 'clear';

type ProductPriceUpdate = Pick<
  Product,
  'price' | 'priceAdjustmentBasePrice' | 'salePrice' | 'isOnSale'
>;

function collectCategoryIds(categories: Category[], rootId: number): number[] {
  const childrenByParent = new Map<number, number[]>();

  for (const category of categories) {
    const parentId =
      typeof category.parent === 'object'
        ? category.parent?.id
        : category.parent;

    if (typeof parentId !== 'number') {
      continue;
    }

    const children = childrenByParent.get(parentId) ?? [];
    children.push(category.id);
    childrenByParent.set(parentId, children);
  }

  // BFS algorithm to find all categories of rootId
  const visited = new Set<number>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const parentId = queue.shift();

    if (typeof parentId !== 'number') {
      continue;
    }

    for (const childId of childrenByParent.get(parentId) ?? []) {
      if (visited.has(childId)) {
        continue;
      }

      visited.add(childId);
      queue.push(childId);
    }
  }

  return [...visited];
}

async function readAction(
  req: PayloadRequest,
): Promise<AdjustmentAction | null> {
  try {
    const body: unknown = await req.json?.();

    if (
      typeof body !== 'object' ||
      body === null ||
      !('action' in body) ||
      (body.action !== 'apply' && body.action !== 'clear') ||
      Object.keys(body).some((key) => key !== 'action')
    ) {
      return null;
    }

    return body.action;
  } catch {
    return null;
  }
}

// Payload doesn't necessarily return every category in one request. It uses pagination.
async function findAllCategories(req: PayloadRequest): Promise<Category[]> {
  const categories: Category[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await req.payload.find({
      collection: 'categories',
      page,
      limit: PAGE_SIZE,
      depth: 0,
      overrideAccess: false,
      req,
    });

    categories.push(...result.docs);
    hasNextPage = result.hasNextPage;
    page += 1;
  }

  return categories;
}

async function findAllProducts(
  req: PayloadRequest,
  categoryIds: number[],
): Promise<Product[]> {
  const products: Product[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await req.payload.find({
      collection: 'products',
      where: {
        categories: {
          in: categoryIds,
        },
      },
      page,
      limit: PAGE_SIZE,
      depth: 0,
      overrideAccess: false,
      req,
    });

    products.push(...result.docs);
    hasNextPage = result.hasNextPage;
    page += 1;
  }

  return products;
}

// prevents the code from performing a database update when nothing actually needs to change.
function pricesMatch(product: Product, update: ProductPriceUpdate): boolean {
  return (
    product.price === update.price &&
    (product.priceAdjustmentBasePrice ?? null) ===
      (update.priceAdjustmentBasePrice ?? null) &&
    (product.salePrice ?? null) === (update.salePrice ?? null) &&
    Boolean(product.isOnSale) === Boolean(update.isOnSale)
  );
}

export const applyPriceAdjustmentHandler = async (req: PayloadRequest) => {
  if (!req.user) {
    return Response.json(
      { success: false, message: 'Authentication is required.' },
      { status: 401 },
    );
  }

  if (req.user.role !== 'admin') {
    return Response.json(
      { success: false, message: 'Administrator access is required.' },
      { status: 403 },
    );
  }

  const action = await readAction(req);

  if (!action) {
    return Response.json(
      {
        success: false,
        message: 'Request body must contain only action: "apply" or "clear".',
      },
      { status: 400 },
    );
  }

  const routeCategoryId = req.routeParams?.id;
  const categoryId = Number(
    Array.isArray(routeCategoryId) ? routeCategoryId[0] : routeCategoryId,
  );

  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
    return Response.json(
      { success: false, message: 'A valid category ID is required.' },
      { status: 400 },
    );
  }

  try {
    const categoryResult = await req.payload.find({
      collection: 'categories',
      where: {
        id: {
          equals: categoryId,
        },
      },
      limit: 1,
      depth: 0,
      overrideAccess: false,
      req,
    });

    const category = categoryResult.docs[0];

    if (!category) {
      return Response.json(
        { success: false, message: 'Category not found.' },
        { status: 404 },
      );
    }

    const adjustmentType = category.priceAdjustment?.adjustmentType;
    const adjustmentValue = category.priceAdjustment?.adjustmentValue;

    if (
      action === 'apply' &&
      adjustmentType !== 'discount' &&
      adjustmentType !== 'increase'
    ) {
      return Response.json(
        {
          success: false,
          message: 'Configure a valid discount or increase before applying it.',
        },
        { status: 400 },
      );
    }

    if (
      action === 'apply' &&
      (typeof adjustmentValue !== 'number' ||
        !Number.isFinite(adjustmentValue) ||
        adjustmentValue <= 0 ||
        adjustmentValue > 100)
    ) {
      return Response.json(
        {
          success: false,
          message: 'Adjustment value must be greater than 0 and at most 100.',
        },
        { status: 400 },
      );
    }

    const categories = await findAllCategories(req);
    const categoryIds = collectCategoryIds(categories, category.id);
    const products = await findAllProducts(req, categoryIds);

    const updates: Array<{
      id: Product['id'];
      data: ProductPriceUpdate;
    }> = [];

    let unchanged = 0;

    for (const product of products) {
      if (
        typeof product.price !== 'number' ||
        !Number.isFinite(product.price) ||
        product.price < 0
      ) {
        throw new Error(`Product ${product.id} has an invalid price.`);
      }

      const basePrice = product.priceAdjustmentBasePrice ?? product.price;

      let data: ProductPriceUpdate;

      if (action === 'clear') {
        data = {
          price: basePrice,
          priceAdjustmentBasePrice: null,
          salePrice: null,
          isOnSale: false,
        };
      } else if (adjustmentType === 'discount') {
        data = {
          price: basePrice,
          priceAdjustmentBasePrice: null,
          salePrice: Math.round(basePrice * (1 - adjustmentValue! / 100)),
          isOnSale: true,
        };
      } else {
        data = {
          price: Math.round(basePrice * (1 + adjustmentValue! / 100)),
          priceAdjustmentBasePrice: basePrice,
          salePrice: null,
          isOnSale: false,
        };
      }

      if (pricesMatch(product, data)) {
        unchanged += 1;
        continue;
      }

      updates.push({
        id: product.id,
        data,
      });
    }

    if (updates.length > 0) {
      const transactionID = await req.payload.db.beginTransaction();

      if (!transactionID) {
        throw new Error('Could not start the price-adjustment transaction.');
      }

      req.transactionID = transactionID;

      try {
        // Keep writes sequential inside the single database transaction.
        for (const update of updates) {
          await req.payload.update({
            collection: 'products',
            id: update.id,
            data: update.data,
            overrideAccess: false,
            req,
          });
        }

        await req.payload.db.commitTransaction(transactionID);
      } catch (error) {
        await req.payload.db.rollbackTransaction(transactionID);
        throw error;
      } finally {
        delete req.transactionID;
      }
    }

    const operation =
      action === 'clear'
        ? 'clear'
        : adjustmentType === 'discount'
          ? 'discount'
          : 'increase';

    return Response.json({
      success: true,
      operation,
      categoryId: category.id,
      categoryCount: categoryIds.length,
      matchedProducts: products.length,
      updatedProducts: updates.length,
      unchangedProducts: unchanged,
      adjustment:
        action === 'apply'
          ? {
              type: adjustmentType,
              value: adjustmentValue,
            }
          : null,
      message:
        action === 'clear'
          ? `Price adjustments were cleared from ${updates.length} products.`
          : `${adjustmentType} was applied to ${updates.length} products.`,
    });
  } catch (error) {
    console.error('Bulk price adjustment failed:', error);

    return Response.json(
      {
        success: false,
        message:
          'The price adjustment failed. No partial price changes were committed.',
      },
      { status: 500 },
    );
  }
};
