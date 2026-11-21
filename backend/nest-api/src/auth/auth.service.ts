// backend/nest-api/src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PayloadClient } from '../payload/payload-client';
import type {
  JwtPayload,
  PayloadAuthenticatedUser,
  UserRole,
} from './auth.types';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly payload: PayloadClient,
  ) {}

  // Returns null for wrong credentials. When Payload is unavailable the
  // client throws 503, so an outage is never reported as a wrong password.
  async validateUser(
    loginDto: LoginUserDto,
  ): Promise<PayloadAuthenticatedUser | null> {
    const user = await this.payload.login(loginDto.email, loginDto.password);

    if (!user) {
      return null;
    }

    // Payload hides the role field from non-administrators. Missing or
    // unexpected roles therefore fail closed to customer privileges.
    const role: UserRole = user.role === 'admin' ? 'admin' : 'customer';

    return { id: user.id, email: user.email, role };
  }

  login(user: PayloadAuthenticatedUser): {
    access_token: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
