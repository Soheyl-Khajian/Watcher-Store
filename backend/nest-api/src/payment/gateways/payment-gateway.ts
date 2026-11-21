// backend/nest-api/src/payment/gateways/payment-gateway.ts
//
// What the payment flow needs from a gateway. Every gateway follows the same
// redirect flow:
// 1. start(): register the payment with the gateway, get an authority (the
//    gateway's id for this payment) and the page to send the customer to.
// 2. The customer pays on the gateway's page and is sent back to us with the
//    authority and a status (OK or NOK).
// 3. verify(): ask the gateway, server to server, whether the money really
//    arrived. The status from step 2 is never trusted on its own.

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export type PaymentGatewayName = 'mock' | 'zarinpal';

export interface StartPaymentInput {
  orderId: number;
  amountRial: number;
  description: string;
  // Where the gateway sends the customer back.
  callbackUrl: string;
}

export interface StartPaymentResult {
  authority: string;
  redirectUrl: string;
}

export interface VerifyPaymentInput {
  authority: string;
  amountRial: number;
  // The status the customer came back with: NOK means they cancelled or
  // the payment failed, so there is nothing to verify.
  callbackStatus: 'OK' | 'NOK';
}

export type VerifyPaymentResult =
  | {
      paid: true;
      // The gateway's reference number for the customer and support.
      refId: string;
      // Masked card number, when the gateway reports it.
      cardPan: string | null;
      // The gateway's answer as received, for disputes.
      raw: unknown;
    }
  | { paid: false; raw: unknown };

export interface PaymentGateway {
  readonly name: PaymentGatewayName;
  start(input: StartPaymentInput): Promise<StartPaymentResult>;
  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
