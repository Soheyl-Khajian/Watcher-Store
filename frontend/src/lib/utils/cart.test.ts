import { describe, expect, it } from 'vitest';
import type { CartItem, Product } from '@/types';
import { findUnavailableItems } from './cart';

const item = (id: number, productId: string): CartItem => ({
  id,
  productId,
  quantity: 1,
});
const product = (id: number | string): Product => ({ id }) as Product;

describe('findUnavailableItems', () => {
  it('returns nothing when every product is available', () => {
    const items = [item(1, '10'), item(2, '20')];

    expect(findUnavailableItems(items, [product(10), product(20)])).toEqual([]);
  });

  it('returns the lines whose product Payload did not return', () => {
    const items = [item(1, '10'), item(2, '20'), item(3, '30')];

    expect(findUnavailableItems(items, [product(20)])).toEqual([
      item(1, '10'),
      item(3, '30'),
    ]);
  });

  it('matches numeric product ids against string cart ids', () => {
    expect(findUnavailableItems([item(1, '7')], [product(7)])).toEqual([]);
    expect(findUnavailableItems([item(1, '7')], [product('7')])).toEqual([]);
  });

  it('treats every line as unavailable when no products came back', () => {
    const items = [item(1, '10')];
    expect(findUnavailableItems(items, [])).toEqual(items);
  });
});
