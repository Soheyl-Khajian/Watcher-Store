// backend/payload-cms/src/views/OrderCells.tsx
//
// Cells of the admin Orders view that show customer-entered and catalog
// text. Product names, names and addresses may be Persian or English, so
// each is isolated (<bdi>, or isolate() in a plain string: see utils/bidi.ts) and
// the marks and numbers around it stay in place.

import React, { Fragment } from 'react';
import { isolate } from '../utils/bidi';
import type { NestOrder } from '../utils/nestOrders';

export const priceFormatter = new Intl.NumberFormat('fa-IR');

export const formatToman = (amount: number): string =>
  `${priceFormatter.format(amount)} تومان`;

// "<name> × <quantity> — <price>"; an item whose product is gone shows its id.
export function OrderItemLine({
  name,
  item,
}: {
  name: string | undefined;
  item: NestOrder['items'][number];
}) {
  return (
    <>
      <bdi>{name ?? `محصول ${item.productId}`}</bdi> ×{' '}
      <bdi>{priceFormatter.format(item.quantity)}</bdi> —{' '}
      <bdi>{formatToman(item.price)}</bdi>
    </>
  );
}

const wrappingText: React.CSSProperties = {
  overflowWrap: 'anywhere',
  whiteSpace: 'pre-wrap',
};

export function ShippingCell({
  shipping,
}: {
  shipping: NestOrder['shipping'];
}) {
  const hasDetails =
    !!shipping && Object.values(shipping).some((value) => value !== null);

  if (!shipping || !hasDetails) {
    return <span>ثبت نشده</span>;
  }

  const location = [shipping.province, shipping.city].filter(
    (part): part is string => !!part,
  );

  const unitAndFloor = [
    shipping.unit ? `واحد ${isolate(shipping.unit)}` : null,
    shipping.floor ? `طبقه ${isolate(shipping.floor)}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join('، ');

  return (
    <div style={{ ...wrappingText, minWidth: '14rem', maxWidth: '24rem' }}>
      {shipping.recipientName && (
        <div>
          <strong>
            <bdi>{shipping.recipientName}</bdi>
          </strong>
        </div>
      )}
      {shipping.phone && (
        <div>
          <bdi dir="ltr">{shipping.phone}</bdi>
        </div>
      )}
      {location.length > 0 && (
        <div>
          {location.map((part, index) => (
            <Fragment key={index}>
              {index > 0 && '، '}
              <bdi>{part}</bdi>
            </Fragment>
          ))}
        </div>
      )}
      {shipping.address && (
        <div>
          <bdi>{shipping.address}</bdi>
        </div>
      )}
      {unitAndFloor && <div>{unitAndFloor}</div>}
      {shipping.postalCode && (
        <div>
          کد پستی: <bdi dir="ltr">{shipping.postalCode}</bdi>
        </div>
      )}
      {shipping.deliveryNotes && (
        <div>
          توضیحات: <bdi>{shipping.deliveryNotes}</bdi>
        </div>
      )}
    </div>
  );
}
