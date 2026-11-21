// backend/nest-api/src/auth/auth.controller.ts

import type { AuthenticatedRequest } from './auth.types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/login-user.dto';
import { Throttle } from '@nestjs/throttler';
import { env } from '../env';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  // Each attempt also costs Payload a password hash; Payload additionally
  // locks an account after 5 failed attempts.
  @Throttle({
    default: { limit: env.RATE_LIMIT_LOGIN_PER_MINUTE, ttl: 60_000 },
  })
  @HttpCode(200)
  @Post('login')
  async login(@Body() loginDto: LoginUserDto) {
    const user = await this.authService.validateUser(loginDto);

    if (!user) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است.');
    }

    return this.authService.login(user);
  }
}
