// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { env } from '../env';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // this method is used in local strategy
  async validateUser(loginDto: LoginUserDto): Promise<any> {
    try {
      const response = await fetch(`${env.PAYLOAD_INTERNAL_URL}/users/login`, {
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
        return null; // if login in payload was unsuccessful
      }

      // reutnr authenticated user from payload
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
