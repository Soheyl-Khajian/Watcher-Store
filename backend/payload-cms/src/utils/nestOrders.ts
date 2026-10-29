// backend/payload-cms/src/utils/nestOrders.ts

import { z } from 'zod';
import { env } from '../env';

export const ORDERS_PAGE_SIZE = 25;

const MAX_PAGE = 100_000;
const REQUEST_TIMEOUT_MS = 5000;

const orderItemSchema = z.object({
  id: z.number().int(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().int().nonnegative(),
});

const shippingSchema = z.object({
  recipientName: z.string().nullable(),
  phone: z.string().nullable(),
  province: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  postalCode: z.string().nullable(),
  unit: z.string().nullable(),
  floor: z.string().nullable(),
  deliveryNotes: z.string().nullable(),
});

const orderSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  total: z.number().int().nonnegative(),
  status: z.string(),
  createdAt: z.string(),
  items: z.array(orderItemSchema),
  // Orders created before shipping details existed have only null columns, and
  // an older Nest may omit the field, so treat it as optional.
  shipping: shippingSchema.nullish(),
});

// z.object strips unknown keys, so only the fields declared here can ever
// reach the page, even if Nest's response grows.
const ordersPageSchema = z.object({
  items: z.array(orderSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type NestOrder = z.infer<typeof orderSchema>;
export type NestOrdersPage = z.infer<typeof ordersPageSchema>;

export type NestOrdersFailureReason =
  | 'not_configured'
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable'
  | 'invalid_response';

export type NestOrdersResult =
  | { ok: true; data: NestOrdersPage }
  | { ok: false; reason: NestOrdersFailureReason };

interface ErrorLogger {
  error: (message: string) => void;
}

// Reads the Payload session token from the Cookie header. The token is only
// ever forwarded server-to-server and must never be rendered.
export function getSessionToken(
  headers: Headers,
  cookiePrefix: string,
): string | null {
  const cookieHeader = headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookieName = `${cookiePrefix}-token`;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === cookieName) {
      const value = part.slice(separator + 1).trim();
      return value.length > 0 ? value : null;
    }
  }

  return null;
}

export function parsePageParam(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,6}$/.test(value)) {
    return 1;
  }

  const page = Number(value);

  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

export async function fetchNestOrders(options: {
  token: string;
  page: number;
  logger: ErrorLogger;
}): Promise<NestOrdersResult> {
  const { token, page, logger } = options;

  if (!env.NEST_INTERNAL_URL) {
    return { ok: false, reason: 'not_configured' };
  }

  const url = new URL('/admin/orders', env.NEST_INTERNAL_URL);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(ORDERS_PAGE_SIZE));

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `JWT ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error(
      `Nest orders request failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
    return { ok: false, reason: 'unavailable' };
  }

  if (response.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  if (response.status === 403) {
    return { ok: false, reason: 'forbidden' };
  }

  if (!response.ok) {
    logger.error(`Nest orders request returned HTTP ${response.status}.`);
    return { ok: false, reason: 'unavailable' };
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    logger.error('Nest orders response was not valid JSON.');
    return { ok: false, reason: 'invalid_response' };
  }

  const parsed = ordersPageSchema.safeParse(body);

  if (!parsed.success) {
    logger.error('Nest orders response did not match the expected shape.');
    return { ok: false, reason: 'invalid_response' };
  }

  return { ok: true, data: parsed.data };
}
