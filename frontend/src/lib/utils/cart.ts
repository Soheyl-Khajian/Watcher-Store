// frontend/src/lib/utils/cart.ts

import type { CartItem, Product } from '@/types';

// Cart lines whose product Payload did not return: deleted, unpublished, or
// never existed. Only call this once the product lookup has succeeded.
export function findUnavailableItems(
  items: CartItem[],
  products: Product[],
): CartItem[] {
  const availableIds = new Set(products.map((product) => String(product.id)));

  return items.filter((item) => !availableIds.has(String(item.productId)));
}
