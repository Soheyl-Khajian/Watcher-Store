import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { ProductsModule } from './products/products.module';
import { env } from './env';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT,
      username: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
      schema: env.NEST_SCHEMA,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Step 1.10 will add migrations
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
