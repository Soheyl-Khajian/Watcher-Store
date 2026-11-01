// backend/nest-api/src/orders/dto/ship-order.dto.ts

import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, Matches } from 'class-validator';
import { normalizeDigits } from '../../common/text/normalize';

// Trims, converts Persian digits, and treats an empty value as absent.
const normalizeTrackingCode = ({ value }: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === '' ? undefined : normalizeDigits(trimmed);
};

export class ShipOrderDto {
  @IsOptional()
  @Transform(normalizeTrackingCode)
  @IsString()
  @Matches(/^[A-Za-z0-9._-]{1,64}$/, {
    message:
      'trackingCode must be 1-64 letters, digits, dots, dashes or underscores',
  })
  trackingCode?: string;
}
