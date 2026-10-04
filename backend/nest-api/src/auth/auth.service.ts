// backend/nest-api/src/auth/auth.service.ts

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { env } from '../env';
import type {
  JwtPayload,
  PayloadAuthenticatedUser,
  UserRole,
} from './auth.types';
import { LoginUserDto } from './dto/login-user.dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null; //remember typeof null === 'object'
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(
    loginDto: LoginUserDto,
  ): Promise<PayloadAuthenticatedUser | null> {
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

      const data: unknown = await response.json();

      if (!response.ok || !isRecord(data) || !isRecord(data.user)) {
        return null;
      }

      const rawId = data.user.id;
      const email = data.user.email;
      const numericId = typeof rawId === 'number' ? rawId : Number(rawId);

      if (
        !Number.isSafeInteger(numericId) ||
        numericId < 1 ||
        typeof email !== 'string' ||
        email.length === 0
      ) {
        return null;
      }

      // Payload hides the role field from non-administrators. Missing or
      // unexpected roles therefore fail closed to customer privileges.
      const role: UserRole = data.user.role === 'admin' ? 'admin' : 'customer';

      return {
        id: numericId,
        email,
        role,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error validating user with Payload:', error);
      return null;
    }
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
