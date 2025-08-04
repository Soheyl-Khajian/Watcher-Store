// مسیر فایل: src/components/layout/cart-content.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { fetchCart, removeFromCart } from '@/lib/api/nestjs';
import { fetchProductsByIds } from '@/lib/api/payload';
import { getCurrentPrice } from '@/lib/utils/pricing'; // تابع کمکی ما
import type { Product, CartItem } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface CartContentProps {
  onClose: () => void;
}

export function CartContent({ onClose }: CartContentProps) {
  const { token, cart, setCart } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const itemIds = useMemo(() => {
    return cart?.items.map((item: CartItem) => item.productId).join(',') || '';
  }, [cart]);

  useEffect(() => {
    const syncData = async () => {
      if (!token) {
        setCart(null);
        setProducts([]);
        return;
      }

      setIsLoading(true);
      try {
        const currentCart = await fetchCart(token);
        setCart(currentCart);

        if (currentCart?.items?.length > 0) {
          const productIds = currentCart.items.map(
            (it: CartItem) => it.productId,
          );
          const fetched = await fetchProductsByIds(productIds);
          setProducts(fetched);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error('Error syncing cart and products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    syncData();
  }, [token, itemIds, setCart]);

  const handleRemoveItem = async (productId: string) => {
    if (!token) return;

    const updatedCart = await removeFromCart(String(productId), token); // اطمینان از ارسال رشته

    if (updatedCart) {
      setCart(updatedCart);
      toast.success('محصول از سبد خرید حذف شد.');
    } else {
      toast.error('خطا در حذف محصول.');
    }
  };

  const cartTotal = useMemo(() => {
    if (!cart?.items || products.length === 0) return 0;
    return cart.items.reduce((total, item) => {
      const product = products.find(
        (p) => String(p.id) === String(item.productId),
      );
      if (!product) return total;
      // ۱. تغییر کلیدی: استفاده از getCurrentPrice برای محاسبه جمع کل
      const price = getCurrentPrice(product);
      return total + price * item.quantity;
    }, 0);
  }, [cart, products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  const itemCount = cart?.items?.length ?? 0;

  return (
    <>
      <SheetHeader>
        <SheetTitle>سبد خرید شما</SheetTitle>
        <SheetDescription>
          {itemCount > 0
            ? `${itemCount} آیتم در سبد شماست.`
            : 'سبد خرید شما خالی است.'}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <p>در حال بارگذاری...</p>
        ) : itemCount > 0 && cart?.items ? (
          <ul className="space-y-4">
            {cart.items.map((item: CartItem) => {
              const product = products.find(
                (p: Product) => String(p.id) === String(item.productId),
              );
              if (!product) return null; // اگر محصول یافت نشد، چیزی رندر نکن

              // ۲. تغییر کلیدی: گرفتن قیمت صحیح برای نمایش هر آیتم
              const pricePerItem = getCurrentPrice(product);

              return (
                <li key={item.id} className="flex items-center gap-4">
                  <div className="flex-grow">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {/* ۳. نمایش قیمت صحیح برای هر آیتم */}
                      {item.quantity} x {formatPrice(pricePerItem)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {/* ۴. نمایش جمع کل صحیح برای هر آیتم */}
                    {formatPrice(pricePerItem * item.quantity)}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(String(item.productId))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="flex h-full items-center justify-center text-muted-foreground">
            سبد خرید شما در حال حاضر خالی است.
          </p>
        )}
      </div>
      {itemCount > 0 && (
        <SheetFooter className="border-t px-4 py-4 sm:px-6">
          <div className="w-full space-y-4">
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <p>جمع کل</p>
              <p>{formatPrice(cartTotal)}</p>
            </div>
            <Button asChild className="w-full mt-6" onClick={onClose}>
              <Link href="/checkout">ادامه و تسویه حساب</Link>
            </Button>
          </div>
        </SheetFooter>
      )}
    </>
  );
}
