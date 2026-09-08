// src/payment/payment.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { env } from '../env';

@Injectable()
export class PaymentService {
  constructor(private readonly ordersService: OrdersService) {}

  // mock payment
  initiatePayment(orderId: number, userId: number): { paymentUrl: string } {
    const baseUrl = `${env.FRONTEND_URL}/payment/verify`; // frontend address
    const successUrl = `${baseUrl}?status=success&orderId=${orderId}`;

    // return always successful for mock payment
    console.log(`ساخت لینک پرداخت برای سفارش ${orderId}: ${successUrl}`);
    return { paymentUrl: successUrl };
  }

  // mock verify payment
  async verifyPayment(
    verifyDto: VerifyPaymentDto,
    userId: number,
  ): Promise<{ message: string }> {
    const { orderId, status } = verifyDto;

    // first find the product and make sure it belongs to the same user
    const order = await this.ordersService.findOne(Number(orderId), userId);
    if (!order) {
      throw new NotFoundException('سفارش یافت نشد.');
    }

    if (status === 'success') {
      // if payment was successful, update user's order
      await this.ordersService.updateOrderStatus(
        order.id,
        OrderStatus.PROCESSING,
      );
      return { message: 'پرداخت با موفقیت تایید شد.' };
    } else {
      // if payment was unsuccessful, update user's order
      await this.ordersService.updateOrderStatus(
        order.id,
        OrderStatus.CANCELLED,
      );
      return { message: 'پرداخت ناموفق بود.' };
    }
  }
}
