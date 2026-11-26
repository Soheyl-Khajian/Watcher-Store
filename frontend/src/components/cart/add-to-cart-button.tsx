// frontend/src/components/cart/add-to-cart-button.tsx

'use client';

import { useT } from '@/i18n/client';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAddToCart } from '@/lib/hooks/use-add-to-cart';

interface AddToCartButtonProps {
  productId: string | number;
  productName: string;
  // False: shown as out of stock and disabled.
  inStock?: boolean;
}

export function AddToCartButton({
  productId,
  productName,
  inStock = true,
}: AddToCartButtonProps) {
  const { add, isAdding } = useAddToCart(productId, productName);
  const t = useT();

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={add}
      disabled={isAdding || !inStock}
      variant={inStock ? 'default' : 'secondary'}
      aria-busy={isAdding}
    >
      <ShoppingCart className="me-2 h-5 w-5" aria-hidden="true" />
      {!inStock ? t('stock.out') : isAdding ? t('cart.adding') : t('cart.add')}
    </Button>
  );
}
