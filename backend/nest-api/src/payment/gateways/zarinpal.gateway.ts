// backend/nest-api/src/payment/gateways/zarinpal.gateway.ts
//
// Zarinpal's v4 REST API (https://www.zarinpal.com/docs/paymentGateway/):
// - POST {base}/pg/v4/payment/request.json  register a payment, get an
//   authority
// - {base}/pg/StartPay/{authority}           the page the customer pays on
// - POST {base}/pg/v4/payment/verify.json   confirm it, server to server;
//   code 100 = paid now, 101 = already confirmed before
// Amounts are sent in rial (currency IRR). {base} is the sandbox host by
// default (ZARINPAL_BASE_URL).
//
// Failure policy, matching the Payload client:
// - Zarinpal unreachable, too slow or answering 5xx -> 503; a payment being
//   verified stays pending and can be checked again later
// - an answer we cannot read, or Zarinpal refusing our request (a
//   configuration problem such as a wrong merchant id) -> 502
// - Zarinpal saying this payment did not happen -> not paid

import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import type {
  PaymentGateway,
  StartPaymentInput,
  StartPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment-gateway';

export interface ZarinpalConfig {
  merchantId: string;
  baseUrl: string;
  timeoutMs: number;
}

const UNAVAILABLE_MESSAGE =
  'درگاه پرداخت موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.';
const BAD_RESPONSE_MESSAGE = 'پاسخ نامعتبری از درگاه پرداخت دریافت شد.';

const PAID = 100;
const ALREADY_VERIFIED = 101;

// Verification answers that settle the question: the money did not arrive
// for this payment.
//  -50 amount differs from the one paid   -51 payment failed
//  -53 payment belongs to another merchant -54 unknown authority
const NOT_PAID_CODES = new Set([-50, -51, -53, -54]);

// Zarinpal answers { data, errors }; whichever does not apply is an empty
// array.
const errorsSchema = z.union([
  z.object({ code: z.number(), message: z.string().optional() }).passthrough(),
  z.array(z.unknown()),
]);

const requestResponseSchema = z.object({
  data: z.union([
    z
      .object({ code: z.number(), authority: z.string().optional() })
      .passthrough(),
    z.array(z.unknown()),
  ]),
  errors: errorsSchema,
});

const verifyResponseSchema = z.object({
  data: z.union([
    z
      .object({
        code: z.number(),
        ref_id: z.union([z.number(), z.string()]).optional(),
        card_pan: z.string().nullish(),
      })
      .passthrough(),
    z.array(z.unknown()),
  ]),
  errors: errorsSchema,
});

const AUTHORITY = /^[A-Za-z0-9]{1,64}$/;

function codeOf(part: unknown): number | undefined {
  return !Array.isArray(part) &&
    typeof part === 'object' &&
    part !== null &&
    'code' in part &&
    typeof part.code === 'number'
    ? part.code
    : undefined;
}

export class ZarinpalGateway implements PaymentGateway {
  readonly name = 'zarinpal' as const;
  private readonly logger = new Logger(ZarinpalGateway.name);

  constructor(private readonly config: ZarinpalConfig) {}

  async start(input: StartPaymentInput): Promise<StartPaymentResult> {
    const body = await this.post('/pg/v4/payment/request.json', {
      merchant_id: this.config.merchantId,
      amount: input.amountRial,
      currency: 'IRR',
      description: input.description,
      callback_url: input.callbackUrl,
      metadata: { order_id: String(input.orderId) },
    });

    const parsed = requestResponseSchema.safeParse(body);
    const data = parsed.success ? parsed.data.data : undefined;
    const authority =
      data && !Array.isArray(data) && data.code === PAID
        ? data.authority
        : undefined;

    if (!authority || !AUTHORITY.test(authority)) {
      this.logger.error(
        `Zarinpal refused the payment request for order ${input.orderId} (code ${
          parsed.success
            ? (codeOf(parsed.data.errors) ?? codeOf(data))
            : 'unreadable'
        }).`,
      );
      throw new BadGatewayException(BAD_RESPONSE_MESSAGE);
    }

    return {
      authority,
      redirectUrl: `${this.config.baseUrl}/pg/StartPay/${authority}`,
    };
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // The customer cancelled or the payment failed at the gateway.
    if (input.callbackStatus === 'NOK') {
      return { paid: false, raw: { Status: 'NOK' } };
    }

    const body = await this.post('/pg/v4/payment/verify.json', {
      merchant_id: this.config.merchantId,
      amount: input.amountRial,
      authority: input.authority,
    });

    const parsed = verifyResponseSchema.safeParse(body);
    if (!parsed.success) {
      this.logger.error('Zarinpal sent an unreadable verification answer.');
      throw new BadGatewayException(BAD_RESPONSE_MESSAGE);
    }

    const { data, errors } = parsed.data;
    const code = codeOf(data) ?? codeOf(errors);

    if (
      !Array.isArray(data) &&
      (data.code === PAID || data.code === ALREADY_VERIFIED) &&
      data.ref_id !== undefined
    ) {
      return {
        paid: true,
        refId: String(data.ref_id),
        cardPan: data.card_pan ?? null,
        raw: body,
      };
    }

    if (code !== undefined && NOT_PAID_CODES.has(code)) {
      if (code === -50) {
        this.logger.error(
          `Zarinpal reports a different amount paid for authority ${input.authority}.`,
        );
      }
      return { paid: false, raw: body };
    }

    // Anything else (bad merchant id, our IP refused, a new code) says
    // nothing about the payment: keep it pending and look at it again.
    this.logger.error(
      `Zarinpal could not verify authority ${input.authority} (code ${code ?? 'none'}).`,
    );
    throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    let status: number;
    let text: string;

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'error',
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      status = response.status;
      text = await response.text();
    } catch (error) {
      this.logger.error(
        `Zarinpal request ${path} failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }

    if (status >= 500) {
      this.logger.error(`Zarinpal request ${path} answered HTTP ${status}.`);
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    }

    try {
      return JSON.parse(text);
    } catch {
      this.logger.error(
        `Zarinpal request ${path} answered HTTP ${status} without JSON.`,
      );
      throw new BadGatewayException(BAD_RESPONSE_MESSAGE);
    }
  }
}
