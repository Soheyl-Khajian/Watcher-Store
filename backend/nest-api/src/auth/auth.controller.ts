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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

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
