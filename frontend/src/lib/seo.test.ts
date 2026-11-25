import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  jsonLdString,
  languageAlternates,
  plainText,
  productJsonLd,
} from './seo';

describe('plainText', () => {
  it('flattens rich text without running words together', () => {
    expect(
      plainText([
        { type: 'h2', children: [{ text: 'ویژگی‌ها' }] },
        { children: [{ text: 'دید در شب' }, { text: ' و ضد آب', bold: true }] },
      ]),
    ).toBe('ویژگی‌ها دید در شب و ضد آب');
  });

  it('keeps a word whole when formatting splits it', () => {
    expect(
      plainText([{ children: [{ text: 'cam' }, { text: 'era', bold: true }] }]),
    ).toBe('camera');
  });

  it('shortens long text at a word boundary', () => {
    const text = plainText('word '.repeat(100), 40);
    expect(text.length).toBeLessThanOrEqual(40);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toMatch(/wor…$/);
  });

  it('returns nothing for empty content', () => {
    expect(plainText(null)).toBe('');
    expect(plainText([])).toBe('');
  });
});

describe('productJsonLd', () => {
  const product = {
    name: 'دوربین دام',
    slug: 'dome-camera',
    sku: 'CAM-1',
    price: 1_500_000,
    stock: 3,
    description: [{ children: [{ text: 'دوربین با دید در شب' }] }],
    gallery: [{ image: { url: '/api/media/file/cam.png', alt: 'cam' } }],
  };

  it('describes the product with its price in rial', () => {
    expect(productJsonLd(product, 'fa')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'دوربین دام',
      url: 'https://shop.example.test/fa/products/dome-camera',
      sku: 'CAM-1',
      image: ['https://shop.example.test/uploads/cam.png'],
      description: 'دوربین با دید در شب',
      offers: {
        '@type': 'Offer',
        url: 'https://shop.example.test/fa/products/dome-camera',
        price: 15_000_000,
        priceCurrency: 'IRR',
        availability: 'https://schema.org/InStock',
      },
    });
  });

  it('uses the sale price and reports sold-out stock', () => {
    const data = productJsonLd(
      {
        ...product,
        isOnSale: true,
        salePrice: 1_200_000,
        stock: 0,
      },
      'en',
    );
    expect(data.offers.price).toBe(12_000_000);
    expect(data.offers.availability).toBe('https://schema.org/OutOfStock');
  });
});

describe('jsonLdString', () => {
  it('cannot close the script element it is placed in', () => {
    const json = jsonLdString({ name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>');
  });
});

describe('absoluteUrl', () => {
  it('builds on the storefront address', () => {
    expect(absoluteUrl('/blog/x')).toBe('https://shop.example.test/blog/x');
  });
});

describe('languageAlternates', () => {
  const settings = {
    defaultLocale: 'fa' as const,
    enabledLocales: ['fa' as const, 'en' as const],
    timeZone: 'Asia/Tehran',
  };

  it('links a page to itself in every offered language', () => {
    expect(languageAlternates('/products/x', 'en', settings)).toEqual({
      canonical: '/en/products/x',
      languages: {
        fa: '/fa/products/x',
        en: '/en/products/x',
        'x-default': '/fa/products/x',
      },
    });
  });

  it('offers only the languages the deployment has', () => {
    expect(
      languageAlternates('/blog', 'fa', {
        ...settings,
        enabledLocales: ['fa'],
      }),
    ).toEqual({
      canonical: '/fa/blog',
      languages: { fa: '/fa/blog', 'x-default': '/fa/blog' },
    });
  });
});
