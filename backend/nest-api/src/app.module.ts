// backend/nest-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmOptions } from './database/typeorm.options';
import { env } from './env';
import { buildPinoHttpOptions } from './logging/logging';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: buildPinoHttpOptions(env) }),
    // Per client IP and per route. In-memory counters: with several API
    // instances, move them to a shared store.
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: env.RATE_LIMIT_PER_MINUTE },
    ]),
    TypeOrmModule.forRoot({
      ...typeOrmOptions,
      // Apply pending migrations on boot so a fresh clone or container is
      // usable without a manual step. Flip to false and run
      // `pnpm migration:run` explicitly if you ever add a real deploy pipeline.
      migrationsRun: true,
    }),
    AuthModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
