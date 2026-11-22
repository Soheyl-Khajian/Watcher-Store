import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it.each([
    '/',
    '/checkout',
    '/profile?tab=orders',
    '/products/camera#reviews',
  ])('keeps the site path %p', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    null,
    undefined,
    '',
    'checkout',
    'https://evil.example/',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
  ])('replaces %p with the home page', (value) => {
    expect(safeNextPath(value)).toBe('/');
  });
});
