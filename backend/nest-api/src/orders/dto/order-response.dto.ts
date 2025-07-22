// src/orders/dto/order-response.dto.ts

import { OrderStatus } from '../entities/order.entity';

class OrderItemResponseDto {
  productId: string;
  quantity: number;
  price: number;
}

export class OrderResponseDto {
  id: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  items: OrderItemResponseDto[];
}
