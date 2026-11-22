import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RichTextNode } from '@/types';
import { RichText } from './RichText';

const render = (content: RichTextNode[]) =>
  renderToStaticMarkup(createElement(RichText, { content }));

const paragraphWithLink = (link: Record<string, unknown>): RichTextNode[] => [
  {
    type: 'p',
    children: [
      { text: 'See ' },
      { type: 'link', children: [{ text: 'this page' }], ...link },
    ],
  },
];

describe('RichText links', () => {
  it('renders a site link as is, with & intact', () => {
    const html = render(paragraphWithLink({ url: '/products?a=1&b=2' }));
    expect(html).toContain('<a href="/products?a=1&amp;b=2">');
    expect(html).not.toContain('&amp;amp;');
  });

  it('opens other sites in a new tab without access to this page', () => {
    const html = render(paragraphWithLink({ url: 'https://example.test' }));
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('honours "open in new tab" for site links', () => {
    const html = render(paragraphWithLink({ url: '/about-us', newTab: true }));
    expect(html).toContain('target="_blank"');
  });

  it.each(['javascript:alert(document.cookie)', 'data:text/html,<b>x</b>'])(
    'shows %p as text, not a link',
    (url) => {
      const html = render(paragraphWithLink({ url }));
      expect(html).not.toContain('<a');
      expect(html).not.toContain('javascript:');
      expect(html).toContain('this page');
    },
  );
});
