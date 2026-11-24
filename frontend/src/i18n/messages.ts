// frontend/src/i18n/messages.ts
//
// Looking up the storefront's text. Every language has its own
// hand-written file (messages/<locale>.json) with the same keys; nothing
// is translated automatically. Keys are checked against the Persian file
// at build time, so a mistyped key fails type-checking.
//
// A message may hold {placeholders}:
// - numbers are written in the page's language (۱۲ or 12);
// - text from data (a product name, a search) is isolated, so it can't
//   scramble a sentence in the other direction (lib/bidi.ts);
// - { key } puts another message in, such as a field's name.
// A message that changes with a count has "one" and "other" forms, chosen
// by the language's plural rules from the "count" value.

import { Fragment, createElement, type ReactNode } from 'react';
import { isolate } from '@/lib/bidi';
import { LOCALE_INFO, type Locale } from './config';
import type { Formatter } from './format';
// The Persian file defines the keys; only its type is used here.
import type fa from './messages/fa.json';

// A message is text, or its plural forms.
type Plural = { one?: string; other: string };
type Leaf = string | Plural;

// Every language's file has the Persian file's keys; a message may be
// text or plural forms. A key missing from a language fails type-checking.
type Catalog<T> = {
  [K in keyof T]: T[K] extends string ? Leaf : Catalog<T[K]>;
};

export type Messages = Catalog<typeof fa>;

// "cart.title", "orders.status.pending", ...
type Keys<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Keys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Keys<typeof fa>;

// A message to show later, in whatever language the page has: library
// code returns these instead of text.
export interface MessageRef {
  key: MessageKey;
  values?: Record<string, MessageValue>;
}

export type MessageValue = string | number | MessageRef;

export interface Translate {
  (key: MessageKey, values?: Record<string, MessageValue>): string;
  // For messages with elements inside, such as a highlighted name:
  // t.rich('products.noMatch', { query: <Bidi>{q}</Bidi> }).
  rich(key: MessageKey, values: Record<string, ReactNode>): ReactNode;
  // Shows a MessageRef.
  ref(message: MessageRef): string;
  // Without isolating text from data, for text outside the page body
  // (titles and descriptions in <head>), where the marks have no use.
  plain(key: MessageKey, values?: Record<string, MessageValue>): string;
}

function isPlural(value: unknown): value is Plural {
  return typeof value === 'object' && value !== null && 'other' in value;
}

function isRef(value: unknown): value is MessageRef {
  return typeof value === 'object' && value !== null && 'key' in value;
}

function lookup(messages: Messages, key: string): Leaf | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function createTranslator(
  locale: Locale,
  messages: Messages,
  format: Formatter,
): Translate {
  const plurals = new Intl.PluralRules(LOCALE_INFO[locale].tag);

  const template = (
    key: string,
    values: Record<string, unknown> | undefined,
  ): string => {
    const message = lookup(messages, key);
    if (message === undefined) {
      // Shows the key rather than nothing; the types make this rare.
      return key;
    }
    if (typeof message === 'string') return message;
    const count = Number(values?.count ?? 0);
    const form = plurals.select(count) as keyof Plural;
    return message[form] ?? message.other;
  };

  const fill = (
    key: MessageKey,
    values: Record<string, MessageValue> | undefined,
    wrap: (text: string) => string,
  ): string =>
    template(key, values).replace(PLACEHOLDER, (match, name: string) => {
      if (!values || !(name in values)) return match;
      const value = values[name];
      if (typeof value === 'number') return format.number(value);
      if (isRef(value)) return fill(value.key, value.values, wrap);
      return wrap(value);
    });

  const t = ((key, values) => fill(key, values, isolate)) as Translate;
  t.plain = (key, values) => fill(key, values, (text) => text);

  t.rich = (key, values) => {
    const parts = template(key, values).split(PLACEHOLDER);
    // split() with a group alternates text and placeholder names.
    return createElement(
      Fragment,
      null,
      ...parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const value = values[part];
        if (typeof value === 'number') return format.number(value);
        return value === undefined ? `{${part}}` : value;
      }),
    );
  };

  t.ref = (message) => t(message.key, message.values);

  return t;
}
