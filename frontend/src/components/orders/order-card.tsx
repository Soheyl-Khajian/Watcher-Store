// frontend/src/components/orders/order-card.tsx
//
// One order in the customer's history: its status and total, details on
// demand (items, address, timeline), and for unpaid orders the choice to
// pay or cancel.

'use client';

import { isolate } from '@/lib/bidi';
import { useFormatter, useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/messages';
import { Bidi } from '@/components/ui/bidi';
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
  const format = useFormatter();
  const t = useT();
  const formatPrice = format.toman;
  const formatDate = format.dateTime;
  const notes = [cancelReasonText(order), refundText(order)].filter(Boolean);
  const events: [MessageKey, string | null][] = [
    ['orders.events.placed', order.createdAt],
    ['orders.events.paid', order.paidAt],
    ['orders.events.shipped', order.shippedAt],
    ['orders.events.completed', order.completedAt],
    ['orders.events.cancelled', order.cancelledAt],
  ];
  const timeline = events.filter((entry): entry is [MessageKey, string] =>
    Boolean(entry[1]),
  );
  const status = orderStatusLabel(order.status);
  const shipping = order.shipping;

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {t('orders.title', { number: format.digits(order.id) })}
        </h3>
        <Badge variant={orderStatusVariant(order.status)}>
          {typeof status === 'string' ? status : t.ref(status)}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-1 text-sm">
        {t('orders.placedAt', { date: formatDate(order.createdAt) })}
      </p>
      <p className="mt-2 text-lg font-bold">
        {t('orders.total', { amount: formatPrice(order.total) })}
      </p>

      {order.trackingCode ? (
        <p className="mt-1 text-sm">
          {t('orders.trackingCode')}{' '}
          <span dir="ltr" className="font-mono">
            {order.trackingCode}
          </span>
        </p>
      ) : null}

      {notes.map((note) =>
        note ? (
          <p key={note.key} className="text-muted-foreground mt-1 text-sm">
            {t.ref(note)}
          </p>
        ) : null,
      )}

      {canPay(order) || canCancel(order) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canPay(order) ? (
            <Button onClick={() => onPay(order)} disabled={busy}>
              {t('orders.pay')}
            </Button>
          ) : null}
          {canCancel(order) ? (
            <Button
              variant="outline"
              onClick={() => onCancel(order)}
              disabled={busy}
            >
              {t('orders.cancel')}
            </Button>
          ) : null}
        </div>
      ) : null}

      <details className="mt-4">
        <summary className="text-primary cursor-pointer text-sm font-medium">
          {t('orders.details')}
        </summary>
        <div className="mt-3 space-y-4 text-sm">
          <section>
            <h4 className="mb-1 font-semibold">{t('orders.items')}</h4>
            <ul className="space-y-1">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    <Bidi>
                      {productNames.get(String(item.productId)) ??
                        t.plain('orders.unknownProduct', {
                          id: item.productId,
                        })}
                    </Bidi>{' '}
                    × <Bidi>{format.number(item.quantity)}</Bidi>
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          {shipping?.recipientName ? (
            <section>
              <h4 className="mb-1 font-semibold">{t('orders.shipTo')}</h4>
              <p>
                <Bidi>{shipping.recipientName}</Bidi>
              </p>
              <p>
                <Bidi ltr>{shipping.phone}</Bidi>
              </p>
              <p>
                {[
                  shipping.province && isolate(shipping.province),
                  shipping.city && isolate(shipping.city),
                  shipping.address && isolate(shipping.address),
                  shipping.unit && t('orders.unit', { value: shipping.unit }),
                  shipping.floor &&
                    t('orders.floor', { value: shipping.floor }),
                ]
                  .filter(Boolean)
                  .join(t('common.listSeparator'))}
              </p>
              {shipping.postalCode ? (
                <p>
                  {t('orders.postalCode')}{' '}
                  <Bidi ltr>{shipping.postalCode}</Bidi>
                </p>
              ) : null}
            </section>
          ) : null}

          <section>
            <h4 className="mb-1 font-semibold">{t('orders.timeline')}</h4>
            <ul className="space-y-1">
              {timeline.map(([label, at]) => (
                <li key={label} className="flex justify-between gap-4">
                  <span>{t(label)}</span>
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
