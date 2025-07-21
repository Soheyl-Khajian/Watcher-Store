// src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt'; //کلاس اصلی استراتژی جی دبلیو تی و همچنین توابع کمکی برای استخراج توکن از هدر
import { PassportStrategy } from '@nestjs/passport'; //کلاس اصلی استراتژی پاسپورت در نست جی اس
import { Injectable } from '@nestjs/common'; //برای تعریف یک سرویس قابل تزریق در نست جی اس
import { ConfigService } from '@nestjs/config'; //برای دسترسی به تنظیمات پیکربندی در نست جی اس

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, //توکن های منقضی شده را رد می‌کند
      secretOrKey: configService.get<string>('JWT_SECRET'), //
    });
  }

  async validate(payload: any) {
    // این بخش به شما اجازه می‌دهد اطلاعات بیشتری از کاربر را به درخواست اضافه کنید
    return { userId: payload.sub, email: payload.email };
  }
}
