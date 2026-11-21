// backend/nest-api/src/common/money/toman.ts

import type { ValueTransformer } from 'typeorm';

// Amounts are whole toman stored as numeric(14,0): at most 14 digits, well
// within JavaScript's safe integers. Payload's product price limit
// (payload-cms productValidation.ts) must match.
export const MAX_TOMAN_AMOUNT = 99_999_999_999_999;

export function isTomanAmount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_TOMAN_AMOUNT
  );
}

export const tomanColumnTransformer: ValueTransformer = {
  to(value: number): string {
    if (!isTomanAmount(value)) {
      throw new RangeError('Invalid toman amount written to the database.');
    }

    return value.toString();
  },

  from(value: string | number): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);

    if (!isTomanAmount(parsedValue)) {
      throw new RangeError('Invalid toman amount read from the database.');
    }

    return parsedValue;
  },
};

// Iranian payment gateways take rial: 1 toman = 10 rial. The largest order
// total is still a safe integer in rial (15 digits).
export const RIALS_PER_TOMAN = 10;

export function tomanToRial(toman: number): number {
  if (!isTomanAmount(toman)) {
    throw new RangeError('Invalid toman amount.');
  }
  return toman * RIALS_PER_TOMAN;
}

function isRialAmount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_TOMAN_AMOUNT * RIALS_PER_TOMAN
  );
}

// For numeric(15,0) rial columns.
export const rialColumnTransformer: ValueTransformer = {
  to(value: number): string {
    if (!isRialAmount(value)) {
      throw new RangeError('Invalid rial amount written to the database.');
    }
    return value.toString();
  },

  from(value: string | number): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);
    if (!isRialAmount(parsedValue)) {
      throw new RangeError('Invalid rial amount read from the database.');
    }
    return parsedValue;
  },
};
