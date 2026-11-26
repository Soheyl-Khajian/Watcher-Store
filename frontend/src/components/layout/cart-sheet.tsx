// frontend/src/components/layout/cart-sheet.tsx
'use client';

import { useFormatter, useLocale, useT } from '@/i18n/client';
import { LOCALE_INFO } from '@/i18n/config';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart } from 'lucide-react';
import { CartContent } from '../cart/cart-content';
import { useAuthStore } from '@/lib/store/auth';
import { useMemo } from 'react';

export function CartSheet() {
  const { cart } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const format = useFormatter();
  const t = useT();
  // The cart opens from the end of the page, the side its button is on.
  const side = LOCALE_INFO[useLocale()].dir === 'rtl' ? 'left' : 'right';

  const totalQuantity = useMemo(() => {
    return cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }, [cart]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          {totalQuantity > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs"
            >
              {format.number(totalQuantity)}
            </span>
          )}
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">
            {totalQuantity > 0
              ? t('cart.openWithCount', { count: totalQuantity })
              : t('cart.open')}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="flex flex-col p-4 sm:p-6">
        <CartContent onClose={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
