// backend/nest-api/src/payment/payment.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from '../env';
import { OrdersModule } from '../orders/orders.module';
import { Payment } from './entities/payment.entity';
import { MockGateway } from './gateways/mock.gateway';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway';
import type { PaymentGateway } from './gateways/payment-gateway';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

// The gateway named by PAYMENT_GATEWAY, or null when payments are off.
function createGateway(): PaymentGateway | null {
  switch (env.PAYMENT_GATEWAY) {
    case 'mock':
      return new MockGateway();
    case 'none':
      return null;
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    { provide: PAYMENT_GATEWAY, useFactory: createGateway },
  ],
})
export class PaymentModule {}
