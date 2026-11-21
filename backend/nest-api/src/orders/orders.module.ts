// backend/nest-api/src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayloadModule } from '../payload/payload.module';
import { ProductsModule } from '../products/products.module';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderExpiryService } from './order-expiry.service';

@Module({
  // PayloadModule: the admin controller's PayloadAdminGuard asks Payload
  // who the session belongs to.
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductsModule,
    PayloadModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrderExpiryService],
  exports: [OrdersService],
})
export class OrdersModule {}
