// backend/nest-api/src/orders/order-expiry.service.ts

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { env } from '../env';
import { OrdersService } from './orders.service';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Cancels unpaid orders that have been waiting longer than the configured
// time limit and releases the stock they reserved.
@Injectable()
export class OrderExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpiryService.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(private readonly ordersService: OrdersService) {}

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

  expireStalePendingOrders(): Promise<number> {
    return this.ordersService.expireStalePendingOrders(
      env.PENDING_ORDER_TTL_HOURS,
    );
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
