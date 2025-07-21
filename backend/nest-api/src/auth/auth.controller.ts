// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(AuthGuard('jwt')) // این مسیر را با استراتژی jwt محافظت می‌کند
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user; // اطلاعات کاربر از توکن استخراج شده و در دسترس است
  }

  // @Post('register')
  // async register(@Body() registerUserDto: RegisterUserDto) {
  //   // در یک پروژه واقعی از DTO برای اعتبارسنجی ورودی استفاده می‌شود
  //   return this.authService.register(registerUserDto);
  // }

  @UseGuards(AuthGuard('local'))
  @HttpCode(200)
  @Post('login')
  async login(@Request() req: any) {
    return this.authService.login(req.user);
  }
}
