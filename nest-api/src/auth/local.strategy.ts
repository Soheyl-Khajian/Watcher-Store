// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // به passport می‌گوییم که از فیلد 'email' به عنوان نام کاربری استفاده کند
    super({ usernameField: 'email' });
  }

  // این تابع به صورت خودکار توسط AuthGuard فراخوانی می‌شود
  async validate(email: string, pass: string): Promise<any> {
    const user = await this.authService.validateUser({
      email,
      password: pass,
    } as LoginUserDto);
    if (!user) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است.');
    }
    return user;
  }
}
