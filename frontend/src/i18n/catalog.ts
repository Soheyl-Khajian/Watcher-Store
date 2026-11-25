// frontend/src/i18n/catalog.ts
//
// Each language's messages, each written by hand in its own file. A page
// sends its own language's messages to the browser, not every language's.

import type { Locale } from './config';
import type { Messages } from './messages';
import en from './messages/en.json';
import fa from './messages/fa.json';

const CATALOG: Record<Locale, Messages> = { fa, en };

export function messagesFor(locale: Locale): Messages {
  return CATALOG[locale];
}
