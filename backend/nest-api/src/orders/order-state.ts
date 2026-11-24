// backend/nest-api/src/orders/order-state.ts

import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from './entities/order.entity';
import { ApiError, type ErrorCode } from '../common/http/api-error';

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
  code: ErrorCode,
): void {
  if (!canTransition(from, to)) {
    throw new ApiError(
      HttpStatus.CONFLICT,
      code,
      `An order cannot go from ${from} to ${to}.`,
    );
  }
}
