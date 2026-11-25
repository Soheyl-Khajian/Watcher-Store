import { describe, expect, it } from 'vitest';
import { LOCALES } from './config';
import { messagesFor } from './catalog';

// "cart.title", ...; plural forms count as one message.
function keysOf(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  const entries = Object.entries(node as Record<string, unknown>);
  if (entries.some(([key]) => key === 'other')) return [prefix];
  return entries.flatMap(([key, value]) =>
    keysOf(value, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholdersOf(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function leafAt(node: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce((n, part) => (n as Record<string, unknown>)[part], node);
}

describe('message files', () => {
  const persian = messagesFor('fa');
  const keys = keysOf(persian).sort();

  it.each(LOCALES)('%s has exactly the Persian file’s keys', (locale) => {
    expect(keysOf(messagesFor(locale)).sort()).toEqual(keys);
  });

  it.each(LOCALES)('%s fills the same placeholders', (locale) => {
    for (const key of keys) {
      const expected = placeholdersOf(String(leafAt(persian, key)));
      const leaf = leafAt(messagesFor(locale), key);
      const forms =
        typeof leaf === 'string'
          ? [leaf]
          : Object.values(leaf as Record<string, string>);
      for (const form of forms) {
        // Plural forms may leave the count out ("One item").
        const found = placeholdersOf(form).filter(
          (name) => name !== 'count' || expected.includes('count'),
        );
        expect([key, found]).toEqual([
          key,
          expected.filter((name) => name !== 'count' || found.includes(name)),
        ]);
      }
    }
  });

  it('has no message left empty', () => {
    for (const locale of LOCALES) {
      for (const key of keys) {
        const leaf = leafAt(messagesFor(locale), key);
        const forms =
          typeof leaf === 'string'
            ? [leaf]
            : Object.values(leaf as Record<string, string>);
        for (const form of forms)
          expect([locale, key, form.trim()]).not.toEqual([locale, key, '']);
      }
    }
  });
});
