// backend/nest-api/src/auth/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectDataSource } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { env } from '../env';
import type { AuthenticatedUser, JwtPayload, UserRole } from './auth.types';

interface PayloadUserRow {
  id: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!Number.isSafeInteger(payload.sub) || payload.sub < 1) {
      throw new UnauthorizedException();
    }

    // PAYLOAD_SCHEMA is validated as a safe SQL identifier in env.ts.
    // The user ID remains parameterized.
    const users = (await this.dataSource.query(
      `
        SELECT
          "id",
          "email",
          "role"
        FROM "${env.PAYLOAD_SCHEMA}"."users"
        WHERE "id" = $1
        LIMIT 1
      `,
      [payload.sub],
    )) as PayloadUserRow[]; // dataSource.query() returns an array of rows.

    const user = users[0];

    if (
      !user ||
      typeof user.email !== 'string' ||
      (user.role !== 'admin' && user.role !== 'customer')
    ) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
