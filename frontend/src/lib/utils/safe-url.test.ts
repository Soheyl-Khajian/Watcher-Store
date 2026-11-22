import { describe, expect, it } from 'vitest';
import { isExternalUrl, safeUrl } from './safe-url';

describe('safeUrl', () => {
  it.each([
    '/about-us',
    'about-us',
    'blog/new-cameras',
    '#contact',
    '?page=2',
    'https://example.test/path?q=1&b=2',
    'http://example.test',
    'HTTPS://EXAMPLE.TEST',
    'mailto:info@example.test',
    'tel:+982100000000',
  ])('keeps %p', (url) => {
    expect(safeUrl(url)).toBe(url);
  });

  it('trims surrounding spaces', () => {
    expect(safeUrl('  /about-us ')).toBe('/about-us');
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example',
    '/\\evil.example',
    '',
    '   ',
    null,
    undefined,
    42,
  ])('refuses %p', (url) => {
    expect(safeUrl(url)).toBeNull();
  });
});

describe('isExternalUrl', () => {
  it('tells other sites from site paths', () => {
    expect(isExternalUrl('https://instagram.com/shop')).toBe(true);
    expect(isExternalUrl('/about-us')).toBe(false);
    expect(isExternalUrl('mailto:info@example.test')).toBe(false);
  });
});
