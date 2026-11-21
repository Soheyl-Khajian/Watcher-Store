// backend/nest-api/src/auth/guards/payload-admin.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PayloadClient } from '../../payload/payload-client';
import type { AuthenticatedRequest } from '../auth.types';

const PAYLOAD_AUTH_SCHEME_PREFIX = 'JWT ';
const MAX_PAYLOAD_TOKEN_LENGTH = 4096;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// Accepts only "Authorization: JWT <payload-token>". Nest's own Bearer tokens
// are deliberately not accepted here.
function extractPayloadToken(header: string | undefined): string | null {
  if (!header || !header.startsWith(PAYLOAD_AUTH_SCHEME_PREFIX)) {
    return null;
  }

  const token = header.slice(PAYLOAD_AUTH_SCHEME_PREFIX.length);

  if (token.length > MAX_PAYLOAD_TOKEN_LENGTH || !JWT_SHAPE.test(token)) {
    return null;
  }

  return token;
}

// Payload owns users and sessions. This guard asks Payload who the token
// belongs to and allows only administrators. Any unexpected situation fails
// closed: PayloadClient turns outages into 503 and nonsense into 502.
@Injectable()
export class PayloadAdminGuard implements CanActivate {
  constructor(private readonly payload: PayloadClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractPayloadToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    const user = await this.payload.currentUser(token);

    if (!user) {
      throw new UnauthorizedException();
    }

    // Payload hides the role field from non-administrators, so customers
    // arrive here without a role.
    if (user.role !== 'admin') {
      throw new ForbiddenException();
    }

    request.user = {
      userId: user.id,
      email: user.email,
      role: 'admin',
    };

    return true;
  }
}
