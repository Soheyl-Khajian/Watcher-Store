// frontend/src/lib/product-card.ts
//
// What a product card shows, taken from the full product on the server.
// Cards are client components, so everything passed to them is sent to the
// browser with the page; descriptions, specifications and the gallery are
// left behind.

import type { Product } from '@/types';
import { mediaSrc } from '@/lib/utils/media';
import { stockOf } from '@/lib/stock';

export interface CardProduct {
  id: string | number;
  name: string;
  slug: string;
  price: number;
  // Set only while the product is on sale.
  salePrice: number | null;
  stock: number;
  // '' when the product has no image.
  imageUrl: string;
}

export function toCardProduct(product: Product): CardProduct {
  const image = product.gallery?.[0]?.image;
  const onSale =
    product.isOnSale === true &&
    typeof product.salePrice === 'number' &&
    product.salePrice > 0;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug ?? '',
    price: product.price,
    salePrice: onSale ? (product.salePrice as number) : null,
    stock: stockOf(product),
    imageUrl: typeof image === 'object' ? mediaSrc(image?.url) : '',
  };
}
