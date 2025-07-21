// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; //برای خواندن مقادیر از فایل‌های .env یا تنظیمات محیطی (مثل JWT_SECRET).
import { LocalStrategy } from './local.strategy'; // استراتژی محلی برای ورود با ایمیل و رمز عبور
import { JwtStrategy } from './jwt.strategy'; // استراتژی JWT برای اعتبارسنجی توکن‌های JWT

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], //اینجا کانفیگ ماژول را ایمپورت می‌کند چون کانفیگ سرویس به آن نیاز دارد
      useFactory: async (configService: ConfigService) => ({
        //یوز فکتوری تابعی است که یک آبجکت پیکربندی برای جی دبلیو تی برمی‌گرداند
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService], //اینجا کانفیگ سرویس را به عنوان وابستگی تزریق می‌کند
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy], //سرویس‌ها و استراتژی‌ها (کدهای اجرایی)
  controllers: [AuthController], //کنترلرهایی که درخواست‌ها را مدیریت می‌کنند
})
export class AuthModule {} //این کلاس کد یا متد ندارد
