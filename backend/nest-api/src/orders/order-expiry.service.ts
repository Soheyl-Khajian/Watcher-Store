// backend/nest-api/src/orders/order-expiry.service.ts

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IntervalJob } from '../common/jobs/interval-job';
import { env } from '../env';
import { OrdersService } from './orders.service';

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

// Cancels unpaid orders that have been waiting longer than the configured
// time limit and releases the stock they reserved.
@Injectable()
export class OrderExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpiryService.name);
  private readonly job = new IntervalJob({
    description: 'expire stale pending orders',
    intervalMs: SWEEP_INTERVAL_MS,
    logger: this.logger,
    run: async () => {
      const expired = await this.expireStalePendingOrders();
      if (expired > 0) {
        this.logger.log(
          `Expired ${expired} pending order(s) older than ${env.PENDING_ORDER_TTL_HOURS}h`,
        );
      }
    },
  });

  constructor(private readonly ordersService: OrdersService) {}

  onModuleInit(): void {
    this.job.start();
  }

  // On shutdown, let a running sweep finish before the database pool
  // closes.
  onModuleDestroy(): Promise<void> {
    return this.job.stop();
  }

  expireStalePendingOrders(): Promise<number> {
    return this.ordersService.expireStalePendingOrders(
      env.PENDING_ORDER_TTL_HOURS,
    );
  }
}
