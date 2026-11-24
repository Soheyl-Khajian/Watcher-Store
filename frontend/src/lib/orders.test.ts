import { describe, expect, it } from 'vitest';
import { inPersian } from '@/test/i18n';
import type { Order } from '@/types';
import {
  canCancel,
  canPay,
  cancelReasonText,
  orderStatusLabel,
  refundText,
} from './orders';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    userId: 1,
    total: 100_000,
    status: 'pending',
    refundStatus: 'none',
    cancelReason: null,
    trackingCode: null,
    paidAt: null,
    shippedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2026-11-22T10:00:00.000Z',
    items: [],
    shipping: null,
    ...overrides,
  };
}

describe('order descriptions', () => {
  it('labels every status in Persian', () => {
    const label = (status: string) => {
      const result = orderStatusLabel(status);
      return typeof result === 'string' ? result : inPersian(result);
    };
    expect(label('pending')).toBe('در انتظار پرداخت');
    expect(label('processing')).toBe('در حال پردازش');
    expect(label('shipped')).toBe('ارسال‌شده');
    expect(label('completed')).toBe('تکمیل‌شده');
    expect(label('cancelled')).toBe('لغوشده');
  });

  it('shows an unknown status as is', () => {
    expect(orderStatusLabel('on_hold')).toBe('on_hold');
  });

  it('explains why an order was cancelled', () => {
    expect(
      inPersian(
        cancelReasonText(
          order({ status: 'cancelled', cancelReason: 'expired' }),
        ),
      ),
    ).toContain('مهلت');
    expect(cancelReasonText(order())).toBeNull();
  });

  it('tells the customer about refunds', () => {
    expect(
      inPersian(refundText(order({ refundStatus: 'required' }))),
    ).toContain('بازگردانده می‌شود');
    expect(
      inPersian(refundText(order({ refundStatus: 'refunded' }))),
    ).toContain('بازگردانده شد');
    expect(refundText(order())).toBeNull();
  });
});

describe('order actions', () => {
  it('offers payment and cancellation only for unpaid orders', () => {
    expect(canPay(order())).toBe(true);
    expect(canCancel(order())).toBe(true);

    for (const status of [
      'processing',
      'shipped',
      'completed',
      'cancelled',
    ] as const) {
      expect(canPay(order({ status }))).toBe(false);
      expect(canCancel(order({ status }))).toBe(false);
    }
  });
});
