// frontend/src/lib/stock.ts
//
// How much of a product is in stock, as shown to customers. The count is
// public on purpose: the cart's + button stops at it anyway, so it is
// better stated than discovered. The server checks stock again when the
// cart changes and when the order is placed. Labels are messages (stock.*).

import type { MessageRef } from '@/i18n/messages';

// At or below this, the count is shown as a warning ("only n left").
export const LOW_STOCK = 3;

// Units available: a missing or negative stock counts as none.
export function stockOf(product: { stock?: number | null }): number {
  const stock = product.stock;
  return typeof stock === 'number' && Number.isFinite(stock) && stock > 0
    ? Math.floor(stock)
    : 0;
}

export type StockLevel = 'out' | 'low' | 'in';

export function stockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out';
  return stock <= LOW_STOCK ? 'low' : 'in';
}

export function stockLabel(stock: number): MessageRef {
  switch (stockLevel(stock)) {
    case 'out':
      return { key: 'stock.out' };
    case 'low':
      return { key: 'stock.low', values: { count: stock } };
    default:
      return { key: 'stock.in', values: { count: stock } };
  }
}

// For a cart line holding more than is now in stock.
export function overStockLabel(stock: number): MessageRef {
  return stock <= 0
    ? { key: 'stock.gone' }
    : { key: 'stock.tooMany', values: { count: stock } };
}
