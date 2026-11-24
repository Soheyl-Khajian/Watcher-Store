// The admin Orders view with mixed Persian and English data: every piece
// of text from data is isolated, so "× ۲ — ۶۹۰٬۰۰۰ تومان" stays readable
// next to an English product name.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OrderItemLine, ShippingCell } from '../src/views/OrderCells';

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function expectIsolated(html: string, text: string) {
  const t = escapeRegExp(text);
  expect(html, `"${text}" is not isolated in:\n${html}`).toMatch(
    new RegExp(`<bdi(?: dir="ltr")?>${t}</bdi>|\u2068${t}\u2069`),
  );
}

describe('Admin order cells with mixed-direction text', () => {
  it('isolates the product name, quantity and price of an item', () => {
    const html = renderToStaticMarkup(
      createElement(OrderItemLine, {
        name: 'Galaxy Watch 6',
        item: { id: 1, productId: '11', quantity: 2, price: 690_000 },
      }),
    );
    expectIsolated(html, 'Galaxy Watch 6');
    expectIsolated(html, (2).toLocaleString('fa-IR'));
    expectIsolated(html, `${(690_000).toLocaleString('fa-IR')} تومان`);
  });

  it('shows the id of an item whose product is gone', () => {
    const html = renderToStaticMarkup(
      createElement(OrderItemLine, {
        name: undefined,
        item: { id: 1, productId: '11', quantity: 1, price: 0 },
      }),
    );
    expectIsolated(html, 'محصول 11');
  });

  it('isolates every part of the shipping details', () => {
    const html = renderToStaticMarkup(
      createElement(ShippingCell, {
        shipping: {
          recipientName: 'Sara Ahmadi',
          phone: '09121234567',
          province: 'تهران',
          city: 'Tehran',
          address: 'Valiasr St. No. 12',
          postalCode: '1234567890',
          unit: '4B',
          floor: '3',
          deliveryNotes: 'Call before delivery',
        },
      }),
    );
    for (const text of [
      'Sara Ahmadi',
      '09121234567',
      'تهران',
      'Tehran',
      'Valiasr St. No. 12',
      '1234567890',
      'Call before delivery',
    ]) {
      expectIsolated(html, text);
    }
    expect(html).toContain('واحد \u20684B\u2069');
  });
});
