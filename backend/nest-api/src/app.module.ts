import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { join } from 'path';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'), // ← فایل ریشه
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        type: 'postgres',
        host: cs.get('DATABASE_HOST'),
        port: cs.get<number>('DATABASE_PORT'),
        username: cs.get('POSTGRES_USER'),
        password: cs.get('POSTGRES_PASSWORD'),
        database: cs.get('POSTGRES_DB'),
        schema: cs.get('NEST_SCHEMA'),
        entities: [
          __dirname + '/cart/entities/*.entity.{ts,js}',
          __dirname + '/orders/entities/*.entity.{ts,js}',
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
