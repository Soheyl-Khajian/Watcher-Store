// backend/nest-api/src/payment/payment.service.ts

import { Injectable } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { PaymentStatus, VerifyPaymentDto } from './dto/verify-payment.dto';
import { env } from '../env';

@Injectable()
export class PaymentService {
  constructor(private readonly ordersService: OrdersService) {}

  async initiatePayment(
    orderId: number,
    userId: number,
  ): Promise<{ paymentUrl: string }> {
    await this.ordersService.findPendingOrderForPayment(orderId, userId);

    const baseUrl = `${env.FRONTEND_URL}/payment/verify`;
    const successUrl = `${baseUrl}?status=${PaymentStatus.SUCCESS}&orderId=${orderId}`;

    console.log(`ساخت لینک پرداخت برای سفارش ${orderId}: ${successUrl}`);

    return { paymentUrl: successUrl };
  }

  async verifyPayment(
    verifyDto: VerifyPaymentDto,
    userId: number,
  ): Promise<{ message: string }> {
    const { orderId, status } = verifyDto;

    if (status === PaymentStatus.SUCCESS) {
      await this.ordersService.transitionPendingOrderAfterPayment(
        orderId,
        userId,
        OrderStatus.PROCESSING,
      );

      return {
        message: 'پرداخت با موفقیت تایید شد.',
      };
    }

    await this.ordersService.transitionPendingOrderAfterPayment(
      orderId,
      userId,
      OrderStatus.CANCELLED,
    );

    return {
      message: 'پرداخت ناموفق بود.',
    };
  }
}
