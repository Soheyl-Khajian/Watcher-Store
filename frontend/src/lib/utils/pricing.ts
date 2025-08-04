// مسیر فایل: frontend/lib/utils/pricing.ts
import type { Product } from '@/types';

export function getCurrentPrice(product: Product): number {
  // شرط جدید: قیمت فروش ویژه باید یک عدد بزرگتر از صفر باشد
  if (
    product.isOnSale &&
    typeof product.salePrice === 'number' &&
    product.salePrice > 0
  ) {
    return product.salePrice;
  }
  return product.price;
}
