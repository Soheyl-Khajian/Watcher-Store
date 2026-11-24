// backend/nest-api/src/payload/payload-client.ts
//
// The only way Nest talks to Payload over HTTP. Every call has a timeout and
// one failure policy:
// - Payload unreachable, too slow or answering 5xx -> 503 (try again later)
// - Payload answering with something unexpected     -> 502
// Responses are validated before use.

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../env';
import type { ProductDto } from '../products/dto/product.dto';
import { ApiError } from '../common/http/api-error';

const positiveId = z.coerce.number().int().positive();

// Payload hides the role field from non-administrators.
const payloadUserSchema = z.object({
  id: positiveId,
  email: z.string().min(1),
  role: z.string().optional(),
});

const loginResponseSchema = z.object({ user: payloadUserSchema });
const meResponseSchema = z.object({ user: payloadUserSchema.nullable() });

const productSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string(),
  status: z.enum(['published', 'draft']).nullish(),
  price: z.number(),
  salePrice: z.number().nullish(),
  isOnSale: z.boolean().nullish(),
  stock: z.number().nullish(),
});

export type PayloadUser = z.infer<typeof payloadUserSchema>;

interface PayloadResponse {
  status: number;
  // undefined when the body is not JSON.
  body: unknown;
}

@Injectable()
export class PayloadClient {
  private readonly logger = new Logger(PayloadClient.name);

  // Checks a storefront login. Returns null for wrong credentials.
  async login(email: string, password: string): Promise<PayloadUser | null> {
    const response = await this.request('/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Payload answers 401 for wrong credentials and a locked account, and
    // 400/403 for unverified or otherwise refused logins.
    if ([400, 401, 403].includes(response.status)) {
      return null;
    }

    return this.parse(loginResponseSchema, response, 'login').user;
  }

  // Resolves a Payload admin-panel session token. Returns null when the
  // token is invalid or expired.
  async currentUser(token: string): Promise<PayloadUser | null> {
    const response = await this.request('/users/me', {
      headers: { Authorization: `JWT ${token}`, Accept: 'application/json' },
    });

    if (response.status === 401 || response.status === 403) {
      return null;
    }

    return this.parse(meResponseSchema, response, 'session lookup').user;
  }

  // Loads a product as the public sees it: drafts look like missing products.
  async findProduct(id: string | number): Promise<ProductDto> {
    const response = await this.request(
      `/products/${encodeURIComponent(String(id))}?depth=0`,
    );

    if (response.status === 403 || response.status === 404) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'PRODUCT_NOT_FOUND',
        'The product was not found or is not published.',
      );
    }

    return this.parse(productSchema, response, 'product lookup');
  }

  // True when Payload answers at all (any status below 500). An anonymous
  // session lookup is the cheapest request it serves.
  async ping(): Promise<boolean> {
    try {
      await this.request('/users/me', {
        headers: { Accept: 'application/json' },
      });
      return true;
    } catch {
      return false;
    }
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<PayloadResponse> {
    let status: number;
    let text: string;

    try {
      const response = await fetch(`${env.PAYLOAD_INTERNAL_URL}${path}`, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(env.PAYLOAD_TIMEOUT_MS),
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      this.logger.error(
        `Payload request ${path.split('?')[0]} failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'UNAVAILABLE',
        'Payload could not be reached.',
      );
    }

    if (status >= 500) {
      this.logger.error(
        `Payload request ${path.split('?')[0]} answered HTTP ${status}.`,
      );
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'UNAVAILABLE',
        'Payload could not be reached.',
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }

    return { status, body };
  }

  private parse<T>(
    schema: z.ZodType<T>,
    response: PayloadResponse,
    what: string,
  ): T {
    const result =
      response.status === 200 ? schema.safeParse(response.body) : null;

    if (!result?.success) {
      this.logger.error(
        `Payload ${what} returned an unexpected response (HTTP ${response.status}).`,
      );
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'BAD_GATEWAY',
        'Payload sent an unexpected response.',
      );
    }

    return result.data;
  }
}
