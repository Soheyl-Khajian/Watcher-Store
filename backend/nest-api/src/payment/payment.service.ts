// backend/nest-api/src/payment/payment.service.ts

import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { tomanToRial } from '../common/money/toman';
import { env } from '../env';
import { OrderStatus } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway';
import type { PaymentGateway } from './gateways/payment-gateway';

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
      throw new ServiceUnavailableException(
        'پرداخت آنلاین در حال حاضر در دسترس نیست.',
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

    // A replayed or repeated callback: already settled.
    if (payment.status !== PaymentStatus.PENDING) {
      return payment.orderId;
    }

    try {
      await this.settle(payment, callbackStatus);
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

  // Asks the gateway whether the money arrived, then records the result on
  // the payment and its order together. Settling the same payment twice
  // changes nothing the second time.
  private async settle(
    payment: Payment,
    callbackStatus: 'OK' | 'NOK',
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

      if (!locked || locked.status !== PaymentStatus.PENDING) {
        return locked?.status ?? PaymentStatus.FAILED;
      }

      locked.gatewayResponse = result.raw;
      locked.verifiedAt = new Date();

      if (result.paid) {
        locked.status = PaymentStatus.PAID;
        locked.refId = result.refId;
        locked.cardPan = result.cardPan;
        await this.ordersService.applyPaymentResult(
          manager,
          locked.orderId,
          OrderStatus.PROCESSING,
        );
        this.logger.log(
          `Payment ${locked.id} for order ${locked.orderId} paid (ref ${result.refId}).`,
        );
      } else {
        locked.status = PaymentStatus.FAILED;
        await this.ordersService.applyPaymentResult(
          manager,
          locked.orderId,
          OrderStatus.CANCELLED,
        );
      }

      await paymentRepository.save(locked);
      return locked.status;
    });
  }
}
