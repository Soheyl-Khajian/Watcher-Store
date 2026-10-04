// backend/nest-api/src/auth/auth.types.ts

import type { Request } from 'express';

export type UserRole = 'admin' | 'customer';

export interface PayloadAuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
