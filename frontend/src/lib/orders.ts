// frontend/src/lib/orders.ts
//
// How the storefront describes an order to its customer, and what they may
// do with it. The API enforces the same rules; these only decide which
// buttons to show.

import type { Order, OrderStatus } from '@/types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  completed: 'تکمیل‌شده',
  cancelled: 'لغوشده',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
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

const CANCEL_REASONS: Record<NonNullable<Order['cancelReason']>, string> = {
  customer_request: 'به درخواست شما لغو شد.',
  admin: 'توسط فروشگاه لغو شد.',
  expired: 'به دلیل پرداخت نشدن در مهلت مقرر لغو شد.',
  payment_failed: 'به دلیل ناموفق بودن پرداخت لغو شد.',
};

export function cancelReasonText(order: Order): string | null {
  return order.cancelReason
    ? (CANCEL_REASONS[order.cancelReason] ?? null)
    : null;
}

export function refundText(order: Order): string | null {
  switch (order.refundStatus) {
    case 'required':
      return 'مبلغ پرداختی به شما بازگردانده می‌شود.';
    case 'refunded':
      return 'مبلغ پرداختی به شما بازگردانده شد.';
    default:
      return null;
  }
}

// Only unpaid orders can be paid or cancelled by the customer; paid ones
// go through the shop.
export const canPay = (order: Order): boolean => order.status === 'pending';
export const canCancel = (order: Order): boolean => order.status === 'pending';
