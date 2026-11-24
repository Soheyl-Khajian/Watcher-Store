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

const paragraph = (...children: RichTextNode[]): RichTextNode => ({
  type: 'p',
  children,
});

describe('RichText elements', () => {
  it.each(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])('renders %s', (type) => {
    expect(render([{ type, children: [{ text: 'Title' }] }])).toBe(
      `<${type} dir="auto">Title</${type}>`,
    );
  });

  it('renders lists and blockquotes', () => {
    const html = render([
      {
        type: 'ol',
        children: [
          { type: 'li', children: [{ text: 'one' }] },
          { type: 'li', children: [{ text: 'two' }] },
        ],
      },
      { type: 'blockquote', children: [{ text: 'quoted' }] },
    ]);
    expect(html).toBe(
      '<ol dir="auto"><li>one</li><li>two</li></ol><blockquote dir="auto">quoted</blockquote>',
    );
  });

  it('applies every leaf mark', () => {
    const html = render([
      paragraph(
        { text: 'b', bold: true },
        { text: 'i', italic: true },
        { text: 'u', underline: true },
        { text: 's', strikethrough: true },
        { text: 'c', code: true },
      ),
    ]);
    expect(html).toBe(
      '<p dir="auto"><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code></p>',
    );
  });

  it('keeps line breaks and renders text as text, never as HTML', () => {
    const html = render([paragraph({ text: 'line one\n<script>x</script>' })]);
    expect(html).toBe(
      '<p dir="auto">line one<br/>&lt;script&gt;x&lt;/script&gt;</p>',
    );
  });

  it('shows uploaded images with their alt text', () => {
    const html = render([
      {
        type: 'upload',
        relationTo: 'media',
        value: {
          url: '/api/media/file/cam.png',
          alt: 'Dome camera',
          width: 800,
          height: 600,
        },
        children: [{ text: '' }],
      },
    ]);
    expect(html).toContain('<figure>');
    expect(html).toContain('alt="Dome camera"');
    // Optimized by next/image, from the storefront's own /uploads/.
    expect(html).toContain('/_next/image?url=%2Fuploads%2Fcam.png');
    expect(html).toContain('<figcaption>Dome camera</figcaption>');
  });

  it('skips an upload that was not populated', () => {
    expect(render([{ type: 'upload', value: 42, children: [] }])).toBe('');
  });

  // An unknown element used to become a <p>, which could put a paragraph
  // inside a paragraph (invalid HTML that browsers repair unpredictably).
  it('keeps the content of unknown elements without wrapping it', () => {
    const html = render([
      paragraph(
        { text: 'before ' },
        { type: 'mention', children: [{ text: 'x' }] },
      ),
    ]);
    expect(html).toBe('<p dir="auto">before x</p>');
  });

  it('renders nothing for empty content', () => {
    expect(render([])).toBe('');
  });
});
