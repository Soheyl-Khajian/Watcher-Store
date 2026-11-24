import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/i18n/client';
import { Pager } from './pager';

const render = (page: number, totalPages: number) =>
  renderToStaticMarkup(
    createElement(
      I18nProvider,
      { locale: 'fa', enabledLocales: ['fa'] },
      createElement(Pager, {
        page,
        totalPages,
        hrefFor: (p: number) => `/products?page=${p}`,
      }),
    ),
  );

describe('Pager', () => {
  it('renders nothing for a single page', () => {
    expect(render(1, 1)).toBe('');
  });

  it('never links to "#"', () => {
    for (const page of [1, 2, 5]) {
      expect(render(page, 5)).not.toContain('href="#"');
    }
  });

  it('disables "previous" on the first page and "next" on the last', () => {
    const first = render(1, 3);
    expect(first).not.toContain('rel="prev"');
    expect(first).toContain('rel="next"');
    expect(first).toContain('aria-disabled="true"');

    const last = render(3, 3);
    expect(last).toContain('rel="prev"');
    expect(last).not.toContain('rel="next"');
  });

  it('marks the current page and links the others, in Persian digits', () => {
    const html = render(2, 3);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/fa/products?page=1"');
    expect(html).toContain('href="/fa/products?page=3"');
    expect(html).toContain('aria-label="صفحه ۳"');
    expect(html).not.toContain('href="/fa/products?page=2"');
  });

  it('shows gaps instead of every page of a long list', () => {
    const html = render(10, 20);
    expect(html).toContain('…');
    expect(html).toContain('href="/fa/products?page=20"');
    expect(html).not.toContain('href="/fa/products?page=15"');
  });
});
