// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, // <-- UsersService را تزریق کنید
    private jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginUserDto): Promise<any> {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (user && (await bcrypt.compare(loginDto.password, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(registerDto: RegisterUserDto): Promise<any> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create(registerDto, hashedPassword);
    const { password_hash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
