// backend/nest-api/src/orders/dto/order-response.dto.ts

import {
  Order,
  OrderCancelReason,
  OrderRefundStatus,
  OrderStatus,
} from '../entities/order.entity';
import { RIALS_PER_TOMAN } from '../../common/money/toman';
import type { Payment } from '../../payment/entities/payment.entity';

class OrderItemResponseDto {
  id!: number;
  productId!: string;
  quantity!: number;
  price!: number;
}

class ShippingDetailsResponseDto {
  recipientName!: string | null;
  phone!: string | null;
  province!: string | null;
  city!: string | null;
  address!: string | null;
  postalCode!: string | null;
  unit!: string | null;
  floor!: string | null;
  deliveryNotes!: string | null;
}

export class OrderResponseDto {
  id!: number;
  userId!: number;
  total!: number;
  status!: OrderStatus;
  refundStatus!: OrderRefundStatus;
  cancelReason!: OrderCancelReason | null;
  trackingCode!: string | null;
  paidAt!: Date | null;
  shippedAt!: Date | null;
  completedAt!: Date | null;
  cancelledAt!: Date | null;
  createdAt!: Date;
  items!: OrderItemResponseDto[];
  shipping!: ShippingDetailsResponseDto;
}

export class PaginatedOrdersResponseDto {
  items!: OrderResponseDto[];
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}

// A payment that must go back to the customer (or went back, refundedAt).
export class RefundResponseDto {
  paymentId!: number;
  // Toman.
  amount!: number;
  gateway!: string;
  // The gateway's reference number, to find the payment in its panel.
  refId!: string | null;
  cardPan!: string | null;
  paidAt!: Date | null;
  refundedAt!: Date | null;
}

export class AdminOrderResponseDto extends OrderResponseDto {
  refunds!: RefundResponseDto[];
}

// The administrators' list: each order with the payments it owes back,
// and how many orders, across all pages, still owe a refund.
export class AdminOrdersResponseDto extends PaginatedOrdersResponseDto {
  declare items: AdminOrderResponseDto[];
  refundsRequired!: number;
}

export function toRefundResponse(payment: Payment): RefundResponseDto {
  return {
    paymentId: payment.id,
    amount: payment.amountRial / RIALS_PER_TOMAN,
    gateway: payment.gateway,
    refId: payment.refId,
    cardPan: payment.cardPan,
    paidAt: payment.verifiedAt,
    refundedAt: payment.refundedAt,
  };
}

// What an order looks like outside the API: an explicit allow-list, so
// internal bookkeeping (checkoutKey, stockReserved) never leaves it.
export function toOrderResponse(order: Order): OrderResponseDto {
  return {
    id: order.id,
    userId: order.userId,
    total: order.total,
    status: order.status,
    refundStatus: order.refundStatus,
    cancelReason: order.cancelReason,
    trackingCode: order.trackingCode,
    paidAt: order.paidAt,
    shippedAt: order.shippedAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    createdAt: order.createdAt,
    items: (order.items ?? []).map(({ id, productId, quantity, price }) => ({
      id,
      productId,
      quantity,
      price,
    })),
    shipping: {
      recipientName: order.shipping?.recipientName ?? null,
      phone: order.shipping?.phone ?? null,
      province: order.shipping?.province ?? null,
      city: order.shipping?.city ?? null,
      address: order.shipping?.address ?? null,
      postalCode: order.shipping?.postalCode ?? null,
      unit: order.shipping?.unit ?? null,
      floor: order.shipping?.floor ?? null,
      deliveryNotes: order.shipping?.deliveryNotes ?? null,
    },
  };
}
