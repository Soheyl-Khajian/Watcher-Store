// backend/nest-api/src/auth/guards/payload-admin.guard.ts

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { env } from '../../env';
import type { AuthenticatedRequest } from '../auth.types';

const PAYLOAD_AUTH_SCHEME_PREFIX = 'JWT ';
const MAX_PAYLOAD_TOKEN_LENGTH = 4096;
const PAYLOAD_SESSION_TIMEOUT_MS = 3000;
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

interface PayloadSessionUser {
  id: number;
  email: string;
  role: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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
// closed.
@Injectable()
export class PayloadAdminGuard implements CanActivate {
  private readonly logger = new Logger(PayloadAdminGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractPayloadToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    const user = await this.loadPayloadUser(token);

    // Payload hides the role field from non-administrators, so customers
    // arrive here with an undefined role.
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

  private async loadPayloadUser(token: string): Promise<PayloadSessionUser> {
    let status: number;
    let body: unknown;

    try {
      const response = await fetch(`${env.PAYLOAD_INTERNAL_URL}/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `JWT ${token}`,
          Accept: 'application/json',
        },
        redirect: 'error',
        signal: AbortSignal.timeout(PAYLOAD_SESSION_TIMEOUT_MS),
      });

      status = response.status;
      body = status === 200 ? await response.json() : null;
    } catch (error) {
      this.logger.error(
        `Payload session lookup failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException();
    }

    if (status === 401 || status === 403) {
      throw new UnauthorizedException();
    }

    if (status !== 200 || !isRecord(body) || !('user' in body)) {
      this.logger.error(
        `Payload session lookup returned an unexpected response (HTTP ${status}).`,
      );
      throw new ServiceUnavailableException();
    }

    // Payload answers 200 with a null user when the token is invalid or
    // expired.
    if (body.user === null) {
      throw new UnauthorizedException();
    }

    const rawUser = body.user;

    if (!isRecord(rawUser)) {
      this.logger.error('Payload session lookup returned a malformed user.');
      throw new ServiceUnavailableException();
    }

    const id = typeof rawUser.id === 'number' ? rawUser.id : Number(rawUser.id);

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      typeof rawUser.email !== 'string' ||
      rawUser.email.length === 0
    ) {
      this.logger.error('Payload session lookup returned an invalid user.');
      throw new ServiceUnavailableException();
    }

    return { id, email: rawUser.email, role: rawUser.role };
  }
}
