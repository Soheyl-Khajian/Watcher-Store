// src/app/(main)/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { fetchUserOrders } from '@/lib/api/nestjs';
import type { Order } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getOrders = async () => {
      if (token) {
        const userOrders = await fetchUserOrders(token);
        if (userOrders) {
          setOrders(userOrders);
        }
        setIsLoading(false);
      }
    };
    getOrders();
  }, [token]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (isLoading) {
    return <div>در حال بارگذاری تاریخچه سفارشات...</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <h1 className="mb-8 text-3xl font-bold">پروفایل من</h1>
      <Card>
        <CardHeader>
          <CardTitle>تاریخچه سفارشات</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <ul className="space-y-6">
              {orders.map((order) => (
                <li key={order.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold">سفارش #{order.id}</p>
                    <Badge>{order.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    تاریخ ثبت:{' '}
                    {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    مبلغ کل: {formatPrice(order.total)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>شما تاکنون هیچ سفارشی ثبت نکرده‌اید.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
