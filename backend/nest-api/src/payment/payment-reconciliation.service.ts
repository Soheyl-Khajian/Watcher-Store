// backend/nest-api/src/payment/payment-reconciliation.service.ts

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IntervalJob } from '../common/jobs/interval-job';
import { PaymentService } from './payment.service';

const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;

// Settles payments whose customer never came back from the gateway (closed
// the browser after paying, lost their connection): see
// PaymentService.reconcilePendingPayments.
@Injectable()
export class PaymentReconciliationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private readonly job = new IntervalJob({
    description: 'reconcile pending payments',
    intervalMs: RECONCILE_INTERVAL_MS,
    logger: this.logger,
    run: async () => {
      const settled = await this.paymentService.reconcilePendingPayments();
      if (settled > 0) {
        this.logger.log(`Reconciled ${settled} pending payment(s)`);
      }
    },
  });

  constructor(private readonly paymentService: PaymentService) {}

  onModuleInit(): void {
    this.job.start();
  }

  onModuleDestroy(): Promise<void> {
    return this.job.stop();
  }
}
