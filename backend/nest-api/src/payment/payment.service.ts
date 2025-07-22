// src/payment/payment.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly ordersService: OrdersService) {}

  // ۱. ساخت لینک پرداخت جعلی
  initiatePayment(orderId: number, userId: number): { paymentUrl: string } {
    // در دنیای واقعی، اینجا با API درگاه پرداخت صحبت می‌کنیم.
    // اما ما فقط یک لینک جعلی می‌سازیم که کاربر را به فرانت‌اند برمی‌گرداند.
    const baseUrl = 'http://localhost:3002/payment/verify'; // آدرس در فرانت‌اند
    const successUrl = `${baseUrl}?status=success&orderId=${orderId}`;

    // برای تست، ما همیشه لینک پرداخت موفق را برمی‌گردانیم.
    console.log(`ساخت لینک پرداخت برای سفارش ${orderId}: ${successUrl}`);
    return { paymentUrl: successUrl };
  }

  // ۲. تایید پرداخت جعلی
  async verifyPayment(
    verifyDto: VerifyPaymentDto,
    userId: number,
  ): Promise<{ message: string }> {
    const { orderId, status } = verifyDto;

    // ابتدا سفارش را پیدا می‌کنیم و مطمئن می‌شویم متعلق به همین کاربر است.
    const order = await this.ordersService.findOne(Number(orderId), userId);
    if (!order) {
      throw new NotFoundException('سفارش یافت نشد.');
    }

    if (status === 'success') {
      // اگر پرداخت موفق بود، وضعیت سفارش را به‌روز می‌کنیم.
      await this.ordersService.updateOrderStatus(
        order.id,
        OrderStatus.PROCESSING,
      );
      return { message: 'پرداخت با موفقیت تایید شد.' };
    } else {
      // اگر پرداخت ناموفق بود، وضعیت سفارش را به‌روز می‌کنیم.
      await this.ordersService.updateOrderStatus(
        order.id,
        OrderStatus.CANCELLED,
      );
      return { message: 'پرداخت ناموفق بود.' };
    }
  }
}
