// frontend/src/app/[locale]/(main)/profile/page.tsx
'use client';

import { useFormatter, useT } from '@/i18n/client';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
import { parsePage } from '@/lib/utils/pagination';

function OrderHistory() {
  const status = useRequireSession();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get('page') ?? undefined);

  const [orders, setOrders] = useState<OrdersPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [productNames, setProductNames] = useState(new Map<string, string>());
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);
  const format = useFormatter();
  const t = useT();
  // Only the latest load may show its answer: moving to another page while
  // one is loading must not show the earlier page's orders.
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const thisLoad = ++latestLoad.current;
    const result = await fetchOrdersPage(page);
    if (thisLoad !== latestLoad.current) return;
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
    if (thisLoad !== latestLoad.current) return;
    setProductNames(
      new Map((products ?? []).map((p) => [String(p.id), p.name])),
    );
  }, [page]);

  useEffect(() => {
    if (status === 'signed-in') {
      void load();
    }
    return () => {
      // Answers to a load started before leaving the page are ignored.
      latestLoad.current += 1;
    };
  }, [status, load]);

  const pay = async (order: Order) => {
    setBusyOrderId(order.id);
    const payment = await initiatePayment(order.id);
    if (payment) {
      window.location.href = payment.paymentUrl;
      return;
    }
    toast.error(t('profile.gatewayFailed'));
    setBusyOrderId(null);
  };

  const cancel = async (order: Order) => {
    const number = format.digits(order.id);
    if (!window.confirm(t('profile.confirmCancel', { number }))) return;
    setBusyOrderId(order.id);
    const result = await cancelOrder(order.id);
    if (result.ok) {
      toast.success(t('profile.cancelled'));
      await load();
    } else {
      toast.error(t.error(result.error));
    }
    setBusyOrderId(null);
  };

  if (!orders && !failed) {
    return <p role="status">{t('profile.loading')}</p>;
  }
  if (failed || !orders) {
    return (
      <div role="alert" className="space-y-3">
        <p>{t('profile.failed')}</p>
        <button
          type="button"
          className="text-primary underline"
          onClick={() => void load()}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }
  if (orders.items.length === 0) {
    return <p>{t('profile.none')}</p>;
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
  const t = useT();
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">{t('profile.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{t('profile.history')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p role="status">{t('common.loading')}</p>}>
            <OrderHistory />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
