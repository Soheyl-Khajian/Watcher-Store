// src/components/layout/cart-sheet.tsx
'use client';

import { useFormatter } from '@/i18n/client';
import { useState } from 'react'; // ۱. useState را وارد کنید
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

  const totalQuantity = useMemo(() => {
    return cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }, [cart]);

  return (
    // ۳. وضعیت باز/بسته بودن را به Sheet متصل کنید
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative cursor-pointer">
          {totalQuantity > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs"
            >
              {format.number(totalQuantity)}
            </span>
          )}
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">
            {totalQuantity > 0
              ? `باز کردن سبد خرید، ${format.number(totalQuantity)} کالا`
              : 'باز کردن سبد خرید'}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-4 sm:p-6">
        {/* ۴. تابع بستن را به عنوان پراپ ارسال کنید */}
        <CartContent onClose={() => setIsOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
