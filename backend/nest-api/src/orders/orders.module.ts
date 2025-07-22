// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '../cart/cart.module'; // ماژول سبد خرید را وارد می‌کنیم

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]), // انتیتی‌ها را ثبت می‌کنیم
    CartModule, // برای دسترسی به سرویس سبد خرید
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
