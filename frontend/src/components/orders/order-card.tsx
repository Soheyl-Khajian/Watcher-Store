// frontend/src/components/orders/order-card.tsx
//
// One order in the customer's history: its status and total, details on
// demand (items, address, timeline), and for unpaid orders the choice to
// pay or cancel.

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  canCancel,
  canPay,
  cancelReasonText,
  orderStatusLabel,
  orderStatusVariant,
  refundText,
} from '@/lib/orders';
import type { Order } from '@/types';

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat('fa-IR').format(price)} تومان`;

const formatDate = (value: string) =>
  new Date(value).toLocaleString('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  });

export function OrderCard({
  order,
  productNames,
  busy,
  onPay,
  onCancel,
}: {
  order: Order;
  // Product names by id; items whose product is gone show their id.
  productNames: Map<string, string>;
  busy: boolean;
  onPay: (order: Order) => void;
  onCancel: (order: Order) => void;
}) {
  const notes = [cancelReasonText(order), refundText(order)].filter(Boolean);
  const timeline = [
    ['ثبت سفارش', order.createdAt],
    ['پرداخت', order.paidAt],
    ['ارسال', order.shippedAt],
    ['تکمیل', order.completedAt],
    ['لغو', order.cancelledAt],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const shipping = order.shipping;

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          سفارش #{order.id.toLocaleString('fa-IR', { useGrouping: false })}
        </h2>
        <Badge variant={orderStatusVariant(order.status)}>
          {orderStatusLabel(order.status)}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-1 text-sm">
        تاریخ ثبت: {formatDate(order.createdAt)}
      </p>
      <p className="mt-2 text-lg font-bold">
        مبلغ کل: {formatPrice(order.total)}
      </p>

      {order.trackingCode ? (
        <p className="mt-1 text-sm">
          کد رهگیری مرسوله:{' '}
          <span dir="ltr" className="font-mono">
            {order.trackingCode}
          </span>
        </p>
      ) : null}

      {notes.map((note) => (
        <p key={note} className="text-muted-foreground mt-1 text-sm">
          {note}
        </p>
      ))}

      {canPay(order) || canCancel(order) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canPay(order) ? (
            <Button onClick={() => onPay(order)} disabled={busy}>
              پرداخت
            </Button>
          ) : null}
          {canCancel(order) ? (
            <Button
              variant="outline"
              onClick={() => onCancel(order)}
              disabled={busy}
            >
              لغو سفارش
            </Button>
          ) : null}
        </div>
      ) : null}

      <details className="mt-4">
        <summary className="text-primary cursor-pointer text-sm font-medium">
          جزئیات سفارش
        </summary>
        <div className="mt-3 space-y-4 text-sm">
          <section>
            <h3 className="mb-1 font-semibold">اقلام</h3>
            <ul className="space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {productNames.get(String(item.productId)) ??
                      `محصول ${item.productId}`}{' '}
                    × {item.quantity.toLocaleString('fa-IR')}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          {shipping?.recipientName ? (
            <section>
              <h3 className="mb-1 font-semibold">ارسال به</h3>
              <p>{shipping.recipientName}</p>
              <p dir="ltr" className="text-end">
                {shipping.phone}
              </p>
              <p>
                {[shipping.province, shipping.city, shipping.address]
                  .filter(Boolean)
                  .join('، ')}
                {shipping.unit ? `، واحد ${shipping.unit}` : ''}
                {shipping.floor ? `، طبقه ${shipping.floor}` : ''}
              </p>
              {shipping.postalCode ? (
                <p>کد پستی: {shipping.postalCode}</p>
              ) : null}
            </section>
          ) : null}

          <section>
            <h3 className="mb-1 font-semibold">روند سفارش</h3>
            <ul className="space-y-1">
              {timeline.map(([label, at]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {formatDate(at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </details>
    </li>
  );
}
