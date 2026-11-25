// frontend/src/i18n/server.ts
//
// The page's language for server components, from the header the
// middleware sets on each page request; the default language where there
// is none (the root 404 page).

import { headers } from 'next/headers';
import { isLocale, LOCALE_HEADER, type Locale } from './config';
import { messagesFor } from './catalog';
import { createFormatter, type Formatter } from './format';
import { createTranslator, type Translate } from './messages';
import { localeSettings } from './settings';

export async function getLocale(): Promise<Locale> {
  const locale = (await headers()).get(LOCALE_HEADER);
  return isLocale(locale) ? locale : localeSettings().defaultLocale;
}

export async function getFormatter(): Promise<Formatter> {
  return createFormatter(await getLocale(), localeSettings().timeZone);
}

export async function getT(): Promise<Translate> {
  const locale = await getLocale();
  return createTranslator(
    locale,
    messagesFor(locale),
    createFormatter(locale, localeSettings().timeZone),
  );
}
