// backend/nest-api/src/orders/order-expiry.service.ts

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { env } from '../env';
import { Order, OrderCancelReason, OrderStatus } from './entities/order.entity';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Cancels unpaid orders that have been waiting longer than the configured
// time limit. Pending orders hold no stock, so nothing else needs undoing.
@Injectable()
export class OrderExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpiryService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  onModuleInit(): void {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // One conditional UPDATE. The status check is re-evaluated after the row
  // lock is acquired, so an order paid at the same moment is left alone.
  async expireStalePendingOrders(): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({
        status: OrderStatus.CANCELLED,
        cancelReason: OrderCancelReason.EXPIRED,
        cancelledAt: () => 'now()',
      })
      .where(
        '"status" = :pending AND "createdAt" < now() - make_interval(hours => :ttl)',
        { pending: OrderStatus.PENDING, ttl: env.PENDING_ORDER_TTL_HOURS },
      )
      .execute();

    return result.affected ?? 0;
  }

  private async sweep(): Promise<void> {
    // Skip if the previous run is still going.
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const expired = await this.expireStalePendingOrders();
      if (expired > 0) {
        this.logger.log(
          `Expired ${expired} pending order(s) older than ${env.PENDING_ORDER_TTL_HOURS}h`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to expire stale pending orders',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
