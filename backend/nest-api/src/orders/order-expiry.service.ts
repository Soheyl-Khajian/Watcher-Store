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
  // The sweep in progress, if any.
  private current: Promise<void> | undefined;

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit(): void {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    // Never keep the process alive just for this timer.
    this.timer.unref();
  }

  // On shutdown, stop the timer and let a running sweep finish before the
  // database pool closes.
  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.current;
  }

  expireStalePendingOrders(): Promise<number> {
    return this.ordersService.expireStalePendingOrders(
      env.PENDING_ORDER_TTL_HOURS,
    );
  }

  private sweep(): Promise<void> {
    // Skip if the previous run is still going.
    if (!this.current) {
      this.current = this.runSweep().finally(() => {
        this.current = undefined;
      });
    }
    return this.current;
  }

  private async runSweep(): Promise<void> {
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
    }
  }
}
