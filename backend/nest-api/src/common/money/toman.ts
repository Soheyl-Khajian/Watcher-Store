// backend/nest-api/src/common/money/toman.ts

import type { ValueTransformer } from 'typeorm';

// numeric(10,2) permits at most eight digits before the decimal point.
export const MAX_TOMAN_AMOUNT = 99_999_999;

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
