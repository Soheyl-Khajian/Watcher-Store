// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule], // ماژول سفارشات را اضافه کنید
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
