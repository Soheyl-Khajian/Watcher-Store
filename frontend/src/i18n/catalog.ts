// frontend/src/i18n/catalog.ts
//
// Each language's messages. Server-side only: a page sends its own
// language's messages to the browser, not every language's.

import type { Locale } from './config';
import type { Messages } from './messages';
import fa from './messages/fa.json';

// English shows the Persian messages until messages/en.json is written.
const CATALOG: Record<Locale, Messages> = { fa, en: fa };

export function messagesFor(locale: Locale): Messages {
  return CATALOG[locale];
}
