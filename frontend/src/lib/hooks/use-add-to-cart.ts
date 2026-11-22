// frontend/src/lib/hooks/use-add-to-cart.ts
//
// Adding a product to the cart from a product card or page. While the
// request runs the button is busy, so a double click adds only once.

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { addToCart } from '../api/nestjs';
import { useAuthStore } from '../store/auth';

export function useAddToCart(productId: string | number, productName: string) {
  const status = useAuthStore((state) => state.status);
  const setCart = useAuthStore((state) => state.setCart);
  const [isAdding, setIsAdding] = useState(false);

  const add = async () => {
    if (isAdding) return;
    if (status !== 'signed-in') {
      toast.error('برای افزودن محصول به سبد خرید، لطفاً ابتدا وارد شوید.');
      return;
    }

    setIsAdding(true);
    try {
      const updatedCart = await addToCart(String(productId), 1);
      if (updatedCart) {
        setCart(updatedCart);
        toast.success(`${productName} به سبد خرید اضافه شد.`);
      } else {
        toast.error('خطا در افزودن محصول به سبد خرید.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return { add, isAdding };
}
