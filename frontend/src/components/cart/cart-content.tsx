// frontend/src/components/layout/cart-content.tsx
'use client';

import { Bidi } from '@/components/ui/bidi';
import React, { useEffect, useState, useMemo } from 'react';
import {
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { fetchCart, removeFromCart, setCartQuantity } from '@/lib/api/nestjs';
import { QuantityControl } from '@/components/cart/quantity-control';
import { fetchProductsByIds } from '@/lib/api/payload';
import { getCurrentPrice } from '@/lib/utils/pricing';
import { findUnavailableItems } from '@/lib/utils/cart';
import type { Product, CartItem } from '@/types';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UnavailableCartItem } from '@/components/cart/unavailable-cart-item';
import { StockNote } from '@/components/ui/stock-note';
import { overStockLabel, stockOf } from '@/lib/stock';
import { toast } from 'sonner';

interface CartContentProps {
  onClose: () => void;
}

export function CartContent({ onClose }: CartContentProps) {
  const { status, cart, setCart } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsFailed, setProductsFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // The cart line being changed; its controls are busy meanwhile.
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  // The item ids the product list was last resolved for. Until it matches the
  // current cart, we do not yet know which items are available.
  const [resolvedIds, setResolvedIds] = useState<string | null>(null);

  // The products in the cart, in a stable order: a quantity change keeps
  // the same ids, so product details are not fetched again.
  const itemIds = useMemo(() => {
    return (
      cart?.items
        .map((item: CartItem) => String(item.productId))
        .sort()
        .join(',') || ''
    );
  }, [cart]);

  // The cart as the server has it, once when the sheet opens.
  useEffect(() => {
    if (status !== 'signed-in') return;
    let cancelled = false;
    setIsLoading(true);
    fetchCart()
      .then((currentCart) => {
        if (!cancelled && currentCart) setCart(currentCart);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, setCart]);

  // Product details whenever the set of products in the cart changes (not
  // when only a quantity changes).
  useEffect(() => {
    if (status !== 'signed-in') {
      setProducts([]);
      return;
    }
    const productIds = itemIds ? itemIds.split(',') : [];
    if (productIds.length === 0) {
      setProducts([]);
      setProductsFailed(false);
      setResolvedIds('');
      return;
    }
    let cancelled = false;
    fetchProductsByIds(productIds).then((fetched) => {
      if (cancelled) return;
      setProducts(fetched ?? []);
      setProductsFailed(fetched === null);
      setResolvedIds(itemIds);
    });
    return () => {
      cancelled = true;
    };
  }, [status, itemIds]);

  const handleRemoveItem = async (productId: string) => {
    if (status !== 'signed-in' || busyProductId) return;

    setBusyProductId(productId);
    const updatedCart = await removeFromCart(String(productId));
    setBusyProductId(null);

    if (updatedCart) {
      setCart(updatedCart);
      toast.success('محصول از سبد خرید حذف شد.');
    } else {
      toast.error('خطا در حذف محصول.');
    }
  };

  const handleQuantity = async (productId: string, quantity: number) => {
    if (status !== 'signed-in' || busyProductId) return;

    setBusyProductId(productId);
    const result = await setCartQuantity(productId, quantity);
    setBusyProductId(null);

    if (result.ok) {
      setCart(result.cart);
    } else {
      // For example: not enough in stock.
      toast.error(result.message);
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
            ? `${itemCount.toLocaleString('fa-IR')} قلم کالا در سبد شماست.`
            : 'سبد خرید شما خالی است.'}
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto py-4">
        {itemCount === 0 ? (
          <p className="text-muted-foreground flex h-full items-center justify-center">
            سبد خرید شما در حال حاضر خالی است.
          </p>
        ) : !isResolved ? (
          <p role="status">در حال بارگذاری...</p>
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
                  <div className="flex-grow space-y-2">
                    <p className="font-semibold">
                      <Bidi>{product.name}</Bidi>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      <Bidi>{item.quantity.toLocaleString('fa-IR')}</Bidi> ×{' '}
                      <Bidi>{formatPrice(pricePerItem)}</Bidi>
                    </p>
                    <QuantityControl
                      quantity={item.quantity}
                      productName={product.name}
                      max={stockOf(product)}
                      busy={busyProductId !== null}
                      onChange={(quantity) =>
                        handleQuantity(String(item.productId), quantity)
                      }
                    />
                    {item.quantity > stockOf(product) ? (
                      <p className="text-destructive text-sm" role="alert">
                        {overStockLabel(stockOf(product))}
                      </p>
                    ) : (
                      <StockNote stock={stockOf(product)} className="text-xs" />
                    )}
                  </div>
                  <p className="font-semibold">
                    {formatPrice(pricePerItem * item.quantity)}
                  </p>
                  <Button
                    className="cursor-pointer"
                    variant="ghost"
                    size="icon"
                    aria-label={`حذف ${product.name} از سبد خرید`}
                    disabled={busyProductId !== null}
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
