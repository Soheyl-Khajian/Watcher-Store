// frontend/src/lib/stock.ts
//
// How much of a product is in stock, as shown to customers. The count is
// public on purpose: the cart's + button stops at it anyway, so it is
// better stated than discovered. The server checks stock again when the
// cart changes and when the order is placed.

// At or below this, the count is shown as a warning ("only n left").
export const LOW_STOCK = 3;

const fa = (n: number) => n.toLocaleString('fa-IR');

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

export function stockLabel(stock: number): string {
  switch (stockLevel(stock)) {
    case 'out':
      return 'ناموجود';
    case 'low':
      return `فقط ${fa(stock)} عدد در انبار باقی مانده`;
    default:
      return `${fa(stock)} عدد در انبار`;
  }
}

// For a cart line holding more than is now in stock.
export function overStockLabel(stock: number): string {
  return stock <= 0
    ? 'این کالا دیگر موجود نیست؛ آن را از سبد حذف کنید.'
    : `فقط ${fa(stock)} عدد موجود است؛ تعداد را کم کنید.`;
}
