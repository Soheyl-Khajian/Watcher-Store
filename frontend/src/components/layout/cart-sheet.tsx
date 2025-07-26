// src/components/layout/cart-sheet.tsx
'use client'; // ۱. این کامپوننت را به کلاینت کامپوننت تبدیل می‌کنیم

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ShoppingCart } from 'lucide-react';
import { CartContent } from './cart-content';
import { useAuthStore } from '@/lib/store/auth'; // ۲. store را وارد می‌کنیم

export function CartSheet() {
  const { cart } = useAuthStore();

  // ۳. تعداد کل محصولات را محاسبه می‌کنیم
  const totalQuantity = useMemo(() => {
    return cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }, [cart]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {totalQuantity > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {totalQuantity}
            </span>
          )}
          <ShoppingCart className="h-5 w-5" />
          <span className="sr-only">باز کردن سبد خرید</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col p-4 sm:p-6">
        <CartContent />
      </SheetContent>
    </Sheet>
  );
}
