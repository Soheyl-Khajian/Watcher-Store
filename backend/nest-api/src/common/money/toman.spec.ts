import {
  MAX_TOMAN_AMOUNT,
  isTomanAmount,
  rialColumnTransformer,
  tomanColumnTransformer,
  tomanToRial,
} from './toman';

describe('isTomanAmount', () => {
  it('allows large orders above the former 99,999,999 cap', () => {
    expect(MAX_TOMAN_AMOUNT).toBe(99_999_999_999_999);
    expect(isTomanAmount(100_000_000)).toBe(true);
  });

  it.each([0, 1, 1_500_000, MAX_TOMAN_AMOUNT])('accepts %p', (value) => {
    expect(isTomanAmount(value)).toBe(true);
  });

  it.each([
    ['a negative amount', -1],
    ['a fractional amount', 10.5],
    ['an amount above the column limit', MAX_TOMAN_AMOUNT + 1],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['a numeric string', '1000'],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, value) => {
    expect(isTomanAmount(value)).toBe(false);
  });
});

describe('tomanColumnTransformer', () => {
  it('writes integers as strings', () => {
    expect(tomanColumnTransformer.to(1_500_000)).toBe('1500000');
  });

  it('reads Postgres numeric strings back as integers', () => {
    expect(tomanColumnTransformer.from('1500000.00')).toBe(1_500_000);
    expect(tomanColumnTransformer.from(250)).toBe(250);
  });

  it('refuses to write an invalid amount', () => {
    expect(() => tomanColumnTransformer.to(-5)).toThrow(RangeError);
    expect(() => tomanColumnTransformer.to(1.25)).toThrow(RangeError);
  });

  it('refuses to read an invalid amount', () => {
    expect(() => tomanColumnTransformer.from('12.50')).toThrow(RangeError);
    expect(() => tomanColumnTransformer.from('not a number')).toThrow(
      RangeError,
    );
  });
});

describe('tomanToRial', () => {
  it('converts at 10 rial per toman, up to the largest order', () => {
    expect(tomanToRial(250_000)).toBe(2_500_000);
    expect(Number.isSafeInteger(tomanToRial(MAX_TOMAN_AMOUNT))).toBe(true);
  });

  it.each([-1, 1.5, MAX_TOMAN_AMOUNT + 1])('rejects %p', (value) => {
    expect(() => tomanToRial(value)).toThrow(RangeError);
  });
});

describe('rialColumnTransformer', () => {
  it('round-trips the largest rial amount', () => {
    const largest = tomanToRial(MAX_TOMAN_AMOUNT);
    expect(rialColumnTransformer.from(rialColumnTransformer.to(largest))).toBe(
      largest,
    );
  });

  it('refuses amounts beyond the largest order', () => {
    expect(() =>
      rialColumnTransformer.to(tomanToRial(MAX_TOMAN_AMOUNT) + 1),
    ).toThrow(RangeError);
  });
});
