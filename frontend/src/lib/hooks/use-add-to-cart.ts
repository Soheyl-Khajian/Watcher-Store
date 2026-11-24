// frontend/src/lib/hooks/use-add-to-cart.ts
//
// Adding a product to the cart from a product card or page. While the
// request runs the button is busy, so a double click adds only once.

'use client';

import { isolate } from '@/lib/bidi';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { addToCart } from '../api/nestjs';
import { useAuthStore } from '../store/auth';

export function useAddToCart(productId: string | number, productName: string) {
  const status = useAuthStore((state) => state.status);
  const setCart = useAuthStore((state) => state.setCart);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const add = async () => {
    if (isAdding) return;
    if (status !== 'signed-in') {
      // Logging in brings the customer back to this page.
      toast.info('برای افزودن محصول به سبد خرید، ابتدا وارد حساب خود شوید.', {
        // Long enough to reach for the button.
        duration: 8000,
        action: {
          label: 'ورود',
          onClick: () =>
            router.push(`/login?next=${encodeURIComponent(pathname)}`),
        },
      });
      return;
    }

    setIsAdding(true);
    try {
      const updatedCart = await addToCart(String(productId), 1);
      if (updatedCart) {
        setCart(updatedCart);
        toast.success(`${isolate(productName)} به سبد خرید اضافه شد.`);
      } else {
        toast.error('خطا در افزودن محصول به سبد خرید.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return { add, isAdding };
}
