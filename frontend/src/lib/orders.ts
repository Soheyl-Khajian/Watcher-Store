// frontend/src/lib/orders.ts
//
// How the storefront describes an order to its customer, and what they may
// do with it. The API enforces the same rules; these only decide which
// buttons to show. Descriptions are messages (orders.* in the message
// files), worded in the page's language where they are shown.

import type { MessageRef } from '@/i18n/messages';
import type { Order, OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'completed',
  'cancelled',
];

// A status the storefront doesn't know shows as the API sent it.
export function orderStatusLabel(status: string): MessageRef | string {
  return STATUSES.includes(status as OrderStatus)
    ? { key: `orders.status.${status as OrderStatus}` }
    : status;
}

// Badge styles: a cancelled order stands out, finished ones recede.
export function orderStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'pending':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'secondary';
    default:
      return 'default';
  }
}

const CANCEL_REASONS = [
  'customer_request',
  'admin',
  'expired',
  'payment_failed',
] as const;

export function cancelReasonText(order: Order): MessageRef | null {
  const reason = CANCEL_REASONS.find((known) => known === order.cancelReason);
  return reason ? { key: `orders.cancelReason.${reason}` } : null;
}

export function refundText(order: Order): MessageRef | null {
  switch (order.refundStatus) {
    case 'required':
      return { key: 'orders.refund.required' };
    case 'refunded':
      return { key: 'orders.refund.refunded' };
    default:
      return null;
  }
}

// Only unpaid orders can be paid or cancelled by the customer; paid ones
// go through the shop.
export const canPay = (order: Order): boolean => order.status === 'pending';
export const canCancel = (order: Order): boolean => order.status === 'pending';
