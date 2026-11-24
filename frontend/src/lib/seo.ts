// frontend/src/lib/seo.ts
//
// What search engines and link previews learn about the shop's pages.

import type { Locale } from '@/i18n/config';
import { getLocale, getT } from '@/i18n/server';
import { env } from './env';
import { mediaSrc } from './utils/media';

// The storefront's public address; absolute URLs (canonical links, the
// sitemap, Open Graph) are built on it.
const OPEN_GRAPH_LOCALES: Record<Locale, string> = {
  fa: 'fa_IR',
  en: 'en_US',
};

// Open Graph fields every page needs, in the page's language. A page's
// openGraph replaces the layout's entirely (Next.js does not merge it), so
// pages spread this in.
export async function openGraphDefaults() {
  const [locale, t] = await Promise.all([getLocale(), getT()]);
  return {
    type: 'website',
    locale: OPEN_GRAPH_LOCALES[locale],
    siteName: t('site.name'),
  } as const;
}

export function siteUrl(): URL {
  return new URL(env.NEXT_PUBLIC_FRONTEND_URL ?? 'http://localhost:3002');
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

// Plain text of Payload rich text (or a plain string), shortened at a word
// boundary for meta descriptions.
export function plainText(content: unknown, maxLength = 160): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      parts.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const { text, children } = node as { text?: unknown; children?: unknown };
      if (typeof text === 'string') parts.push(text);
      if (children) {
        walk(children);
        // Elements end with a space so words do not run together; text
        // pieces do not (a word can be split by formatting).
        parts.push(' ');
      }
    }
  };
  walk(content);

  const text = parts.join('').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// An absolute image URL from a Payload media document (or nothing),
// served from the storefront (lib/utils/media.ts).
export function mediaImage(
  media: unknown,
): { url: string; alt?: string; width?: number; height?: number } | null {
  if (!media || typeof media !== 'object') return null;
  const { url, alt, width, height } = media as {
    url?: unknown;
    alt?: unknown;
    width?: unknown;
    height?: unknown;
  };
  const src = typeof url === 'string' ? mediaSrc(url) : '';
  if (!src) return null;
  return {
    // The storefront's /uploads/ address, made absolute for crawlers.
    url: src.startsWith('/') ? absoluteUrl(src) : src,
    ...(typeof alt === 'string' && alt ? { alt } : {}),
    ...(typeof width === 'number' ? { width } : {}),
    ...(typeof height === 'number' ? { height } : {}),
  };
}

interface ProductForJsonLd {
  name: string;
  slug?: string | null;
  sku?: string | null;
  price: number;
  salePrice?: number | null;
  isOnSale?: boolean | null;
  stock?: number | null;
  description?: unknown;
  gallery?: { image?: unknown }[] | null;
}

// schema.org Product data, which search engines show as price and
// availability. Prices are in toman; schema.org needs an ISO currency, so
// they are given in rial (IRR).
export function productJsonLd(product: ProductForJsonLd) {
  const price =
    product.isOnSale &&
    typeof product.salePrice === 'number' &&
    product.salePrice > 0
      ? product.salePrice
      : product.price;
  const url = absoluteUrl(
    `/products/${encodeURIComponent(product.slug ?? '')}`,
  );
  const images = (product.gallery ?? [])
    .map((item) => mediaImage(item.image)?.url)
    .filter((image): image is string => Boolean(image));
  const description = plainText(product.description, 500);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(product.sku ? { sku: product.sku } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(description ? { description } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: price * 10,
      priceCurrency: 'IRR',
      availability:
        (product.stock ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };
}

// JSON for a <script type="application/ld+json">. "<" is escaped so CMS
// text such as "</script>" cannot end the script element.
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
