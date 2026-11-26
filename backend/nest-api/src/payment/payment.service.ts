// backend/nest-api/src/payment/payment.service.ts

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { tomanToRial } from '../common/money/toman';
import { env } from '../env';
import { OrdersService } from '../orders/orders.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway';
import type { PaymentGateway } from './gateways/payment-gateway';
import { ApiError } from '../common/http/api-error';

// Older pending payments are left alone: the gateway has long forgotten
// them, and an administrator should look instead.
const RECONCILE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const RECONCILE_BATCH_SIZE = 50;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    // null when no gateway is configured (PAYMENT_GATEWAY=none).
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGateway | null,
  ) {}

  private requireGateway(): PaymentGateway {
    if (!this.gateway) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'PAYMENT_UNAVAILABLE',
        'Online payment is turned off.',
      );
    }
    return this.gateway;
  }

  // Registers a payment for the customer's pending order and returns the
  // gateway page to send them to.
  async initiatePayment(
    orderId: number,
    userId: number,
  ): Promise<{ paymentUrl: string }> {
    const gateway = this.requireGateway();
    const order = await this.ordersService.findPendingOrderForPayment(
      orderId,
      userId,
    );
    const amountRial = tomanToRial(order.total);

    const started = await gateway.start({
      orderId: order.id,
      amountRial,
      // Shown on the gateway's own payment page, which is in Persian.
      description: `پرداخت سفارش شماره ${order.id}`,
      callbackUrl: env.PAYMENT_CALLBACK_URL,
    });

    await this.paymentRepository.save(
      this.paymentRepository.create({
        orderId: order.id,
        gateway: gateway.name,
        authority: started.authority,
        amountRial,
        status: PaymentStatus.PENDING,
      }),
    );

    return { paymentUrl: started.redirectUrl };
  }

  // The customer is back from the gateway. Verifies the payment with the
  // gateway and records the result. Returns the order to show the customer,
  // or null when the authority matches no payment.
  //
  // Never throws: the customer is redirected either way. When the gateway
  // cannot be reached the payment stays pending, and the storefront shows
  // the order as awaiting confirmation.
  async handleCallback(
    authority: string,
    callbackStatus: 'OK' | 'NOK',
  ): Promise<number | null> {
    const gateway = this.gateway;
    if (!gateway) {
      return null;
    }

    const payment = await this.paymentRepository.findOne({
      where: { gateway: gateway.name, authority },
    });

    if (!payment) {
      this.logger.warn(`Payment callback for an unknown authority.`);
      return null;
    }

    // The reconciliation job marked this payment failed while the customer
    // was still at the gateway (a slow bank OTP, say), and they have now
    // finished paying: ask again rather than lose the payment.
    const recheck =
      payment.status === PaymentStatus.FAILED && callbackStatus === 'OK';

    // A replayed or repeated callback: already settled.
    if (payment.status !== PaymentStatus.PENDING && !recheck) {
      return payment.orderId;
    }

    try {
      await this.settle(payment, callbackStatus, {
        // A late recheck that still finds no payment changes nothing.
        cancelOnFailure: !recheck,
        recheck,
      });
    } catch (error) {
      if (error instanceof HttpException) {
        this.logger.warn(
          `Payment ${payment.id} for order ${payment.orderId} stays pending: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Settling payment ${payment.id} for order ${payment.orderId} failed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return payment.orderId;
  }

  // Payments still pending after PAYMENT_RECONCILE_AFTER_MINUTES: the
  // customer paid (or gave up) and never came back. Asks the gateway what
  // happened to each. Paid ones are settled as usual; unpaid ones are marked
  // failed, and their order is left for the customer to retry or for the
  // expiry job. Returns how many were settled.
  //
  // The least recently checked come first, so payments the gateway cannot
  // answer for move to the back instead of blocking newer ones.
  async reconcilePendingPayments(now = new Date()): Promise<number> {
    const gateway = this.gateway;
    if (!gateway) {
      return 0;
    }

    const stale = await this.paymentRepository.find({
      where: {
        gateway: gateway.name,
        status: PaymentStatus.PENDING,
        createdAt: Between(
          new Date(now.getTime() - RECONCILE_WINDOW_MS),
          new Date(
            now.getTime() - env.PAYMENT_RECONCILE_AFTER_MINUTES * 60_000,
          ),
        ),
      },
      order: { lastCheckedAt: { direction: 'ASC', nulls: 'FIRST' }, id: 'ASC' },
      take: RECONCILE_BATCH_SIZE,
    });

    let settled = 0;
    for (const payment of stale) {
      try {
        await this.settle(payment, null, { cancelOnFailure: false });
        settled += 1;
      } catch (error) {
        // Still pending; the next run asks again, after the others.
        await this.paymentRepository.update(payment.id, {
          lastCheckedAt: now,
        });
        this.logger.warn(
          `Could not reconcile payment ${payment.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    return settled;
  }

  // Asks the gateway whether the money arrived, then records the result on
  // the payment and its order together. Settling the same payment twice
  // changes nothing the second time. A recheck reopens a failed payment,
  // but only when the gateway now says it was paid.
  private async settle(
    payment: Payment,
    callbackStatus: 'OK' | 'NOK' | null,
    options: { cancelOnFailure: boolean; recheck?: boolean },
  ): Promise<PaymentStatus> {
    const gateway = this.requireGateway();

    // Outside the transaction: no row lock is held across a network call.
    const result = await gateway.verify({
      authority: payment.authority,
      amountRial: payment.amountRial,
      callbackStatus,
    });

    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Payment);
      const locked = await paymentRepository.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!locked) {
        return PaymentStatus.FAILED;
      }
      const reopened =
        options.recheck === true &&
        locked.status === PaymentStatus.FAILED &&
        result.paid;
      if (locked.status !== PaymentStatus.PENDING && !reopened) {
        return locked.status;
      }

      locked.lastCheckedAt = new Date();
      locked.gatewayResponse = result.raw;
      locked.verifiedAt = new Date();

      if (result.paid) {
        locked.status = PaymentStatus.PAID;
        locked.refId = result.refId;
        locked.cardPan = result.cardPan;
      } else {
        locked.status = PaymentStatus.FAILED;
      }

      const outcome = await this.ordersService.applyPaymentResult(
        manager,
        locked.orderId,
        result.paid,
        { cancelOnFailure: options.cancelOnFailure },
      );
      await paymentRepository.save(locked);

      if (result.paid) {
        this.logger.log(
          `Payment ${locked.id} for order ${locked.orderId} paid (ref ${result.refId}); order ${outcome}.`,
        );
      }
      return locked.status;
    });
  }
}
