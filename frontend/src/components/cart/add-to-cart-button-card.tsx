// frontend/src/components/cart/add-to-cart-button-card.tsx

'use client';

import { useT } from '@/i18n/client';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/lib/hooks/use-add-to-cart';

interface AddToCartButtonCardProps {
  productId: string | number;
  productName: string;
  // False: shown as out of stock and disabled.
  inStock?: boolean;
}

export function AddToCartButtonCard({
  productId,
  productName,
  inStock = true,
}: AddToCartButtonCardProps) {
  const { add, isAdding } = useAddToCart(productId, productName);
  const t = useT();

  return (
    <Button
      onClick={add}
      disabled={isAdding || !inStock}
      aria-busy={isAdding}
      className="flex w-full items-center justify-center gap-2"
    >
      <span>
        {!inStock
          ? t('stock.out')
          : isAdding
            ? t('cart.adding')
            : t('cart.add')}
      </span>
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
