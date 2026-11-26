// backend/nest-api/src/common/http/api-error.ts
//
// Errors the API tells its clients about, as stable codes. The storefront
// words each code in its page's language (its message files); the API
// itself speaks no customer's language. A code may carry values the
// wording needs (how many are in stock). The English message is for
// developers and logs.

import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  // General, by status: errors that carry no code of their own.
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'BAD_GATEWAY'
  | 'UNAVAILABLE'
  // Login
  | 'INVALID_CREDENTIALS'
  // Products and stock
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_DATA_INVALID'
  | 'OUT_OF_STOCK'
  | 'STOCK_LIMIT'
  // Cart
  | 'CART_FULL'
  | 'CART_LOAD_FAILED'
  | 'CART_ITEM_NOT_FOUND'
  | 'CART_EMPTY'
  | 'CART_CHANGED'
  // Orders
  | 'IDEMPOTENCY_KEY_INVALID'
  | 'ORDER_STOCK_INSUFFICIENT'
  | 'ORDER_TOTAL_TOO_LARGE'
  | 'ORDER_LOAD_FAILED'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_PAYABLE'
  | 'ORDER_NOT_CANCELLABLE'
  | 'ORDER_PAID_CANCEL_VIA_SUPPORT'
  | 'ORDER_NOT_SHIPPABLE'
  | 'ORDER_NOT_COMPLETABLE'
  | 'ORDER_NO_REFUND_NEEDED'
  // Payment
  | 'PAYMENT_UNAVAILABLE'
  | 'GATEWAY_UNAVAILABLE'
  | 'GATEWAY_BAD_RESPONSE';

export type ErrorParams = Record<string, string | number>;

export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly params?: ErrorParams,
  ) {
    super({ code, message, ...(params ? { params } : {}) }, status);
  }
}
