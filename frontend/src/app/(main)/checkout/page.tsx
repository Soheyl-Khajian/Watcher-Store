// مسیر فایل: src/app/(main)/checkout/page.tsx
'use client';

import { useAuthStore } from '@/lib/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Product, CartItem } from '@/types';
import { fetchProductsByIds } from '@/lib/api/payload';
import { createOrder, initiatePayment } from '@/lib/api/nestjs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { getCurrentPrice } from '@/lib/utils/pricing'; // ۱. تابع کمکی را وارد کنید

export default function CheckoutPage() {
  const { cart, token, setCart } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      !isProcessing &&
      (!token || !cart || cart.items.length === 0)
    ) {
      router.push('/');
    }
  }, [token, cart, router, isLoading, isProcessing]);

  useEffect(() => {
    const getProducts = async () => {
      if (cart && cart.items.length > 0) {
        const productIds = cart.items.map((item: CartItem) => item.productId);
        const fetchedProducts = await fetchProductsByIds(productIds);
        setProducts(fetchedProducts);
      }
      setIsLoading(false);
    };
    getProducts();
  }, [cart]);

  const handleCheckout = async () => {
    if (!token) return;
    setIsProcessing(true);

    const order = await createOrder(token);

    if (order && order.id) {
      setCart(null);
      toast.success('سفارش شما با موفقیت ثبت شد. در حال انتقال...');

      const paymentData = await initiatePayment(order.id, token);

      if (paymentData && paymentData.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else {
        toast.error('خطا در اتصال به درگاه پرداخت.');
        setIsProcessing(false);
      }
    } else {
      toast.error('خطا در ثبت سفارش.');
      setIsProcessing(false);
    }
  };

  const cartTotal = useMemo(() => {
    if (!cart?.items || products.length === 0) return 0;
    return cart.items.reduce((total, item) => {
      const product = products.find(
        (p: Product) => String(p.id) === String(item.productId),
      );
      if (!product) return total;
      // ۲. از تابع کمکی برای محاسبه جمع کل استفاده کنید
      const price = getCurrentPrice(product);
      return total + price * item.quantity;
    }, 0);
  }, [cart, products]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (isLoading || !cart) {
    return <div>در حال بارگذاری اطلاعات سفارش...</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>خلاصه سفارش و تسویه حساب</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {cart.items.map((item: CartItem) => {
              const product = products.find(
                (p: Product) => String(p.id) === String(item.productId),
              );
              if (!product) return null;

              // ۳. قیمت صحیح را برای هر آیتم بگیرید
              const currentPrice = getCurrentPrice(product);

              return (
                <li key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">
                      {/* ۴. قیمت صحیح را نمایش دهید */}
                      {item.quantity} x {formatPrice(currentPrice)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {/* ۵. جمع کل صحیح آیتم را نمایش دهید */}
                    {formatPrice(currentPrice * item.quantity)}
                  </p>
                </li>
              );
            })}
          </ul>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold">
            <p>جمع کل</p>
            <p>{formatPrice(cartTotal)}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? 'در حال پردازش...' : 'ثبت سفارش و پرداخت'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
