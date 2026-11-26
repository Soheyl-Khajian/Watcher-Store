// backend/payload-cms/src/endpoints/applyPriceAdjustmentHandler.ts

import type { PayloadRequest } from 'payload';
import type { Product } from '../payload-types';
import { MAX_PRICE } from '../collections/productValidation';
import { requestRevalidation } from '../hooks/revalidateStorefront';
import { collectCategoryIds, findAllCategories } from '../utils/categoryTree';

const PAGE_SIZE = 100;

type AdjustmentAction = 'apply' | 'clear';

type ProductPriceUpdate = Pick<
  Product,
  | 'price'
  | 'priceAdjustmentBasePrice'
  | 'priceAdjustmentSalePrice'
  | 'salePrice'
  | 'isOnSale'
>;

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

// Skips the write when nothing would change.
function pricesMatch(product: Product, update: ProductPriceUpdate): boolean {
  return (
    product.price === update.price &&
    (product.priceAdjustmentBasePrice ?? null) ===
      (update.priceAdjustmentBasePrice ?? null) &&
    (product.priceAdjustmentSalePrice ?? null) ===
      (update.priceAdjustmentSalePrice ?? null) &&
    (product.salePrice ?? null) === (update.salePrice ?? null) &&
    Boolean(product.isOnSale) === Boolean(update.isOnSale)
  );
}

// Why a product was left as it is:
// - manual_sale: it has a sale price set by hand, which the tool keeps;
// - no_discount: the discounted price rounds to nothing, or to the price;
// - too_expensive: the increased price is above the largest price allowed;
// - sale_above_price: clearing an increase would put the price at or below
//   the product's hand-set sale price.
export type SkipReason =
  'manual_sale' | 'no_discount' | 'too_expensive' | 'sale_above_price';

type Plan = { data: ProductPriceUpdate } | { skip: SkipReason };

// What the tool does to one product. The tool remembers the price it
// started from (priceAdjustmentBasePrice) and the sale price it set
// (priceAdjustmentSalePrice), so it undoes only its own changes: a sale
// price an administrator set by hand is never overwritten or cleared.
function plan(
  product: Product,
  action: AdjustmentAction,
  adjustmentType: unknown,
  adjustmentValue: unknown,
): Plan {
  const basePrice = product.priceAdjustmentBasePrice ?? product.price;
  const toolSale = product.priceAdjustmentSalePrice ?? null;
  const manualSale =
    Boolean(product.isOnSale) &&
    typeof product.salePrice === 'number' &&
    product.salePrice !== toolSale;
  // The sale fields as they are, minus the tool's own sale.
  const withoutToolSale = manualSale
    ? { salePrice: product.salePrice, isOnSale: true }
    : { salePrice: null, isOnSale: false };

  if (action === 'clear') {
    if (manualSale && (product.salePrice as number) >= basePrice) {
      return { skip: 'sale_above_price' };
    }
    return {
      data: {
        price: basePrice,
        priceAdjustmentBasePrice: null,
        priceAdjustmentSalePrice: null,
        ...withoutToolSale,
      },
    };
  }

  const value = adjustmentValue as number;

  if (adjustmentType === 'discount') {
    if (manualSale) {
      return { skip: 'manual_sale' };
    }
    const salePrice = Math.round(basePrice * (1 - value / 100));
    if (salePrice < 1 || salePrice >= basePrice) {
      return { skip: 'no_discount' };
    }
    return {
      data: {
        price: basePrice,
        priceAdjustmentBasePrice: null,
        priceAdjustmentSalePrice: salePrice,
        salePrice,
        isOnSale: true,
      },
    };
  }

  const price = Math.round(basePrice * (1 + value / 100));
  if (price > MAX_PRICE) {
    return { skip: 'too_expensive' };
  }
  return {
    data: {
      price,
      priceAdjustmentBasePrice: basePrice,
      priceAdjustmentSalePrice: null,
      ...withoutToolSale,
    },
  };
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
        adjustmentValue > 100 ||
        (adjustmentType === 'discount' && adjustmentValue >= 100))
    ) {
      return Response.json(
        {
          success: false,
          message:
            'Adjustment value must be greater than 0 and at most 100, and a discount below 100.',
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
    const skipped: Array<{
      id: Product['id'];
      name: string;
      reason: SkipReason;
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

      const planned = plan(product, action, adjustmentType, adjustmentValue);
      if ('skip' in planned) {
        skipped.push({
          id: product.id,
          name: product.name,
          reason: planned.skip,
        });
        continue;
      }

      if (pricesMatch(product, planned.data)) {
        unchanged += 1;
        continue;
      }

      updates.push({ id: product.id, data: planned.data });
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
            // One storefront refresh after the commit, not one per product
            // before it (below).
            context: { skipRevalidation: true },
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

      await requestRevalidation(['products'], req.payload.logger);
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
      skippedProducts: skipped,
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
    req.payload.logger.error({
      err: error,
      msg: 'Bulk price adjustment failed',
    });

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
