// backend/nest-api/src/payment/gateways/mock.gateway.ts
//
// Development only (PAYMENT_GATEWAY=mock, refused in production): no money
// moves, and the customer's returned status is believed as-is.

import { randomUUID } from 'crypto';
import type {
  PaymentGateway,
  StartPaymentInput,
  StartPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './payment-gateway';

export class MockGateway implements PaymentGateway {
  readonly name = 'mock' as const;

  async start(input: StartPaymentInput): Promise<StartPaymentResult> {
    const authority = `MOCK-${randomUUID()}`;
    const url = new URL(input.callbackUrl);
    // Skip the gateway page: go straight back as if the payment succeeded.
    url.searchParams.set('Authority', authority);
    url.searchParams.set('Status', 'OK');
    return { authority, redirectUrl: url.toString() };
  }

  // Paid only when the customer came back with OK: a customer who never
  // came back did not pay.
  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const raw = { mock: true, status: input.callbackStatus };
    return input.callbackStatus === 'OK'
      ? { paid: true, refId: input.authority.slice(-12), cardPan: null, raw }
      : { paid: false, raw };
  }
}
