// src/app/(main)/profile/page.tsx
'use client';

import { useFormatter } from '@/i18n/client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { OrderCard } from '@/components/orders/order-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pager } from '@/components/ui/pager';
import {
  cancelOrder,
  fetchOrdersPage,
  initiatePayment,
  type OrdersPage,
} from '@/lib/api/nestjs';
import { fetchProductsByIds } from '@/lib/api/payload';
import { useRequireSession } from '@/lib/hooks/use-require-session';
import type { Order } from '@/types';

function OrderHistory() {
  const status = useRequireSession();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [orders, setOrders] = useState<OrdersPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [productNames, setProductNames] = useState(new Map<string, string>());
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const format = useFormatter();

  const load = useCallback(async () => {
    const result = await fetchOrdersPage(page);
    setFailed(result === null);
    setOrders(result);
    if (!result) return;

    // Names for the items on this page (best effort: ids otherwise).
    const ids = [
      ...new Set(
        result.items.flatMap((order) =>
          order.items.map((item) => item.productId),
        ),
      ),
    ];
    const products = await fetchProductsByIds(ids);
    setProductNames(
      new Map((products ?? []).map((p) => [String(p.id), p.name])),
    );
  }, [page]);

  useEffect(() => {
    if (status === 'signed-in') {
      void load();
    }
  }, [status, load]);

  const pay = async (order: Order) => {
    setBusyOrderId(order.id);
    const payment = await initiatePayment(order.id);
    if (payment) {
      window.location.href = payment.paymentUrl;
      return;
    }
    toast.error('اتصال به درگاه پرداخت ممکن نشد. لطفاً دوباره تلاش کنید.');
    setBusyOrderId(null);
  };

  const cancel = async (order: Order) => {
    const number = format.digits(order.id);
    if (!window.confirm(`سفارش #${number} لغو شود؟`)) return;
    setBusyOrderId(order.id);
    const result = await cancelOrder(order.id);
    if (result.ok) {
      toast.success('سفارش لغو شد.');
      await load();
    } else {
      toast.error(result.message);
    }
    setBusyOrderId(null);
  };

  if (!orders && !failed) {
    return <p role="status">در حال بارگذاری تاریخچه سفارشات...</p>;
  }
  if (failed || !orders) {
    return (
      <div role="alert" className="space-y-3">
        <p>دریافت سفارش‌ها ممکن نشد.</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => void load()}
        >
          تلاش دوباره
        </button>
      </div>
    );
  }
  if (orders.items.length === 0) {
    return <p>شما تاکنون هیچ سفارشی ثبت نکرده‌اید.</p>;
  }

  return (
    <>
      <ul className="space-y-6">
        {orders.items.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            productNames={productNames}
            busy={busyOrderId !== null}
            onPay={pay}
            onCancel={cancel}
          />
        ))}
      </ul>
      <div className="mt-8">
        <Pager
          page={orders.page}
          totalPages={orders.totalPages}
          href="/profile"
        />
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">پروفایل من</h1>
      <Card>
        <CardHeader>
          <CardTitle>تاریخچه سفارشات</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p role="status">در حال بارگذاری...</p>}>
            <OrderHistory />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
