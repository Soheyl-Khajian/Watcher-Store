import { ConflictException } from '@nestjs/common';
import { OrderStatus } from './entities/order.entity';
import {
  ORDER_TRANSITIONS,
  assertTransition,
  canTransition,
} from './order-state';

const { PENDING, PROCESSING, SHIPPED, COMPLETED, CANCELLED } = OrderStatus;

// The full lifecycle, written out independently of ORDER_TRANSITIONS so a
// change to the table has to be made deliberately in both places.
const allowed: Array<[OrderStatus, OrderStatus]> = [
  [PENDING, PROCESSING],
  [PENDING, CANCELLED],
  [PROCESSING, SHIPPED],
  [PROCESSING, CANCELLED],
  [SHIPPED, COMPLETED],
];

const allStatuses = Object.values(OrderStatus);

describe('order state machine', () => {
  it('defines transitions for every status', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual(
      [...allStatuses].sort(),
    );
  });

  it.each(allowed)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to, 'not allowed')).not.toThrow();
  });

  const forbidden = allStatuses.flatMap((from) =>
    allStatuses
      .filter((to) => !allowed.some(([f, t]) => f === from && t === to))
      .map((to): [OrderStatus, OrderStatus] => [from, to]),
  );

  it.each(forbidden)('forbids %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to, 'not allowed')).toThrow(
      ConflictException,
    );
  });

  it.each([COMPLETED, CANCELLED])('treats %s as final', (status) => {
    expect(ORDER_TRANSITIONS[status]).toEqual([]);
  });

  it('reports the caller message on a forbidden transition', () => {
    expect(() => assertTransition(SHIPPED, CANCELLED, 'cannot cancel')).toThrow(
      'cannot cancel',
    );
  });
});
