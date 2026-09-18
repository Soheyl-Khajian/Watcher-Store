// backend/nest-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmOptions } from './database/typeorm.options';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { ProductsModule } from './products/products.module';



@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
})
export class AppModule {}
