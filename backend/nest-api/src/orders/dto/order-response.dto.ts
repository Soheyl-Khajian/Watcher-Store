// backend/nest-api/src/orders/dto/order-response.dto.ts

import {
  Order,
  OrderCancelReason,
  OrderRefundStatus,
  OrderStatus,
} from '../entities/order.entity';

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
