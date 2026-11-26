// frontend/src/lib/hooks/use-add-to-cart.ts
//
// Adding a product to the cart from a product card or page. While the
// request runs the button is busy, so a double click adds only once.

'use client';

import { useT } from '@/i18n/client';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { addToCart, loadSession } from '../api/nestjs';
import { useAuthStore } from '../store/auth';

export function useAddToCart(productId: string | number, productName: string) {
  const setCart = useAuthStore((state) => state.setCart);
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const t = useT();
  const pathname = usePathname();

  const add = async () => {
    if (isAdding) return;
    // A click before the page has asked the server who is logged in waits
    // for that answer instead of asking a logged-in customer to log in.
    if (useAuthStore.getState().status === 'unknown') {
      setIsAdding(true);
      try {
        await loadSession();
      } finally {
        setIsAdding(false);
      }
    }
    const status = useAuthStore.getState().status;
    if (status === 'unknown') {
      toast.error(t('cart.addFailed'));
      return;
    }
    if (status !== 'signed-in') {
      // Logging in brings the customer back to this page.
      toast.info(t('cart.loginToAdd'), {
        // Long enough to reach for the button.
        duration: 8000,
        action: {
          label: t('cart.loginAction'),
          onClick: () =>
            router.push(`/login?next=${encodeURIComponent(pathname)}`),
        },
      });
      return;
    }

    setIsAdding(true);
    try {
      const added = await addToCart(String(productId), 1);
      if (added.ok) {
        setCart(added.cart);
        toast.success(t('cart.added', { name: productName }));
      } else {
        toast.error(t.error(added.error, 'cart.addFailed'));
      }
    } finally {
      setIsAdding(false);
    }
  };

  return { add, isAdding };
}
