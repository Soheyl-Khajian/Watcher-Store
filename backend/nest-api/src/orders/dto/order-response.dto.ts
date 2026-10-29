// backend/nest-api/src/orders/dto/order-response.dto.ts

import {
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
