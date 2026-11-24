import { describe, expect, it } from 'vitest';
import { isolate } from './bidi';

describe('isolate', () => {
  it('wraps text in first-strong isolate marks', () => {
    expect(isolate('Galaxy Watch 6')).toBe('\u2068Galaxy Watch 6\u2069');
    expect(isolate(12)).toBe('\u206812\u2069');
  });

  it('keeps an English name from swallowing the Persian sentence', () => {
    const toast = `${isolate('Galaxy Watch 6')} به سبد خرید اضافه شد.`;
    expect(toast.startsWith('\u2068Galaxy Watch 6\u2069 ')).toBe(true);
  });
});
