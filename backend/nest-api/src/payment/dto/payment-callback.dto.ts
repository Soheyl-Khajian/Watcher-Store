// backend/nest-api/src/payment/dto/payment-callback.dto.ts
//
// The query string a gateway sends the customer back with, e.g.
//   /payment/callback?Authority=A00000000000000000000000000217885159&Status=OK

import { IsIn, Matches } from 'class-validator';

export class PaymentCallbackDto {
  @Matches(/^[A-Za-z0-9-]{1,64}$/)
  Authority!: string;

  @IsIn(['OK', 'NOK'])
  Status!: 'OK' | 'NOK';
}
