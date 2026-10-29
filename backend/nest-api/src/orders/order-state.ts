// backend/nest-api/src/orders/order-state.ts

import { ConflictException } from '@nestjs/common';
import { OrderStatus } from './entities/order.entity';

// The single source of truth for allowed status changes. Every transition in
// the service must pass through assertTransition.
export const ORDER_TRANSITIONS: Readonly<
  Record<OrderStatus, readonly OrderStatus[]>
> = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  message: string,
): void {
  if (!canTransition(from, to)) {
    throw new ConflictException(message);
  }
}
