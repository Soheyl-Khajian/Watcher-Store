// backend/nest-api/src/orders/dto/order-response.dto.ts

import { OrderStatus } from '../entities/order.entity';

class OrderItemResponseDto {
  id!: number;
  productId!: string;
  quantity!: number;
  price!: number;
}

export class OrderResponseDto {
  id!: number;
  userId!: number;
  total!: number;
  status!: OrderStatus;
  createdAt!: Date;
  items!: OrderItemResponseDto[];
}

export class PaginatedOrdersResponseDto {
  items!: OrderResponseDto[];
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}
