import { describe, expect, it } from 'vitest';
import {
  LOW_STOCK,
  overStockLabel,
  stockLabel,
  stockLevel,
  stockOf,
} from './stock';

describe('stockOf', () => {
  it.each([
    [{ stock: 12 }, 12],
    [{ stock: 0 }, 0],
    [{ stock: -2 }, 0],
    [{ stock: null }, 0],
    [{}, 0],
    [{ stock: 4.7 }, 4],
    [{ stock: Number.NaN }, 0],
  ])('reads %j as %i', (product, expected) => {
    expect(stockOf(product)).toBe(expected);
  });
});

describe('stock labels', () => {
  it('says out of stock for none', () => {
    expect(stockLevel(0)).toBe('out');
    expect(stockLabel(0)).toBe('ناموجود');
  });

  it('warns when only a few are left', () => {
    expect(stockLevel(LOW_STOCK)).toBe('low');
    expect(stockLabel(2)).toBe('فقط ۲ عدد در انبار باقی مانده');
  });

  it('states the count otherwise, in Persian digits', () => {
    expect(stockLevel(LOW_STOCK + 1)).toBe('in');
    expect(stockLabel(120)).toBe('۱۲۰ عدد در انبار');
  });

  it('tells the customer what to do when the cart holds too many', () => {
    expect(overStockLabel(2)).toContain('فقط ۲ عدد موجود است');
    expect(overStockLabel(0)).toContain('دیگر موجود نیست');
  });
});
