// frontend/src/components/layout/cart-content.tsx
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
import { getCurrentPrice } from '@/lib/utils/pricing';
import { findUnavailableItems } from '@/lib/utils/cart';
import type { Product, CartItem } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UnavailableCartItem } from '@/components/cart/unavailable-cart-item';
import { toast } from 'sonner';

interface CartContentProps {
  onClose: () => void;
}

export function CartContent({ onClose }: CartContentProps) {
  const { token, cart, setCart } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsFailed, setProductsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // The item ids the product list was last resolved for. Until it matches the
  // current cart, we do not yet know which items are available.
  const [resolvedIds, setResolvedIds] = useState<string | null>(null);

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
      let resolved = '';

      try {
        const currentCart = await fetchCart(token);
        setCart(currentCart);

        const productIds: string[] = (currentCart?.items ?? []).map(
          (it: CartItem) => it.productId,
        );
        resolved = productIds.join(',');

        if (productIds.length > 0) {
          const fetched = await fetchProductsByIds(productIds);
          setProducts(fetched ?? []);
          setProductsFailed(fetched === null);
        } else {
          setProducts([]);
          setProductsFailed(false);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error syncing cart and products:', error);
        setProductsFailed(true);
        resolved = itemIds;
      } finally {
        setResolvedIds(resolved);
        setIsLoading(false);
      }
    };

    syncData();
  }, [token, itemIds, setCart]);

  const handleRemoveItem = async (productId: string) => {
    if (!token) return;

    const updatedCart = await removeFromCart(String(productId), token);

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
      const price = getCurrentPrice(product);
      return total + price * item.quantity;
    }, 0);
  }, [cart, products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  const itemCount = cart?.items?.length ?? 0;
  const isResolved = !isLoading && resolvedIds === itemIds;
  const unavailableCount =
    isResolved && !productsFailed
      ? findUnavailableItems(cart?.items ?? [], products).length
      : 0;
  const checkoutBlocked = !isResolved || productsFailed || unavailableCount > 0;

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
        {itemCount === 0 ? (
          <p className="text-muted-foreground flex h-full items-center justify-center">
            سبد خرید شما در حال حاضر خالی است.
          </p>
        ) : !isResolved ? (
          <p>در حال بارگذاری...</p>
        ) : productsFailed ? (
          <p className="text-destructive">
            امکان دریافت اطلاعات محصولات وجود ندارد. چند لحظه بعد دوباره تلاش
            کنید.
          </p>
        ) : (
          <ul className="space-y-4">
            {cart?.items.map((item: CartItem) => {
              const product = products.find(
                (p: Product) => String(p.id) === String(item.productId),
              );

              // Not returned by Payload: deleted, unpublished, or unknown.
              if (!product) {
                return (
                  <UnavailableCartItem
                    key={item.id}
                    onRemove={() => handleRemoveItem(String(item.productId))}
                  />
                );
              }

              const pricePerItem = getCurrentPrice(product);

              return (
                <li key={item.id} className="flex items-center gap-4">
                  <div className="flex-grow">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-muted-foreground text-sm" dir="ltr">
                      {item.quantity} x {formatPrice(pricePerItem)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(pricePerItem * item.quantity)}
                  </p>
                  <Button
                    className="cursor-pointer"
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
            {unavailableCount > 0 && (
              <p className="text-destructive text-sm">
                برای ادامه، محصولات ناموجود را از سبد حذف کنید.
              </p>
            )}
            {checkoutBlocked ? (
              <Button className="mt-6 w-full" disabled>
                ادامه و تسویه حساب
              </Button>
            ) : (
              <Button asChild className="mt-6 w-full" onClick={onClose}>
                <Link href="/checkout">ادامه و تسویه حساب</Link>
              </Button>
            )}
          </div>
        </SheetFooter>
      )}
    </>
  );
}
