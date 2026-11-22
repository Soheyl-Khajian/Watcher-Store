import { describe, expect, it } from 'vitest';
import { loginPathFor, safeNextPath } from './safe-next';

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

describe('loginPathFor', () => {
  it('returns to the given page after login', () => {
    expect(loginPathFor('/checkout?step=2')).toBe(
      '/login?next=%2Fcheckout%3Fstep%3D2',
    );
  });

  it('never carries another site in next', () => {
    expect(loginPathFor('//evil.example')).toBe('/login?next=%2F');
  });
});
