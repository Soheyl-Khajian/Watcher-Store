import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { expectIsolated } from '@/test/expect-isolated';
import type { Order } from '@/types';
import { OrderCard } from './order-card';

// Mixed Persian and English, as a real store's data is.
const order: Order = {
  id: 7,
  userId: 1,
  total: 1_380_000,
  status: 'processing',
  refundStatus: 'none',
  cancelReason: null,
  trackingCode: null,
  paidAt: '2026-11-22T10:05:00.000Z',
  shippedAt: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: '2026-11-22T10:00:00.000Z',
  items: [
    { id: 1, productId: '11', quantity: 2, price: 690_000 },
    { id: 2, productId: '12', quantity: 1, price: 0 },
  ],
  shipping: {
    recipientName: 'Sara Ahmadi',
    phone: '09121234567',
    province: 'تهران',
    city: 'Tehran',
    address: 'Valiasr St. No. 12',
    postalCode: '1234567890',
    unit: '4B',
    floor: '3',
    deliveryNotes: null,
  },
};

const render = () =>
  renderToStaticMarkup(
    createElement(OrderCard, {
      order,
      productNames: new Map([
        ['11', 'Galaxy Watch 6'],
        ['12', 'ساعت هوشمند'],
      ]),
      busy: false,
      onPay: () => {},
      onCancel: () => {},
    }),
  );

describe('OrderCard with mixed-direction text', () => {
  const html = render();

  it('isolates product names and quantities in the item lines', () => {
    expectIsolated(html, 'Galaxy Watch 6');
    expectIsolated(html, 'ساعت هوشمند');
    expectIsolated(html, (2).toLocaleString('fa-IR'));
  });

  it('isolates each part of the address', () => {
    expectIsolated(html, 'Sara Ahmadi');
    for (const part of ['تهران', 'Tehran', 'Valiasr St. No. 12']) {
      expectIsolated(html, part);
    }
    expect(html).toContain('واحد \u20684B\u2069');
  });

  it('keeps codes left to right', () => {
    expect(html).toContain('<bdi dir="ltr">1234567890</bdi>');
  });
});
