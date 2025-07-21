// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import e from 'express';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  //این متود در استراتژی محلی در حال استفاده شدن هست
  async validateUser(loginDto: LoginUserDto): Promise<any> {
    try {
      const response = await fetch('http://localhost:3000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginDto.email,
          password: loginDto.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return null; // اگر لاگین در Payload ناموفق بود
      }

      // اطلاعات کاربر تایید شده را از پاسخ Payload برمی‌گردانیم
      return data.user;
    } catch (error) {
      console.error('Error validating user with Payload:', error);
      return null;
    }
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
