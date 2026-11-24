// frontend/src/i18n/server.ts
//
// The page's language for server components, from the header the
// middleware sets on each page request; the default language where there
// is none (the root 404 page).

import { headers } from 'next/headers';
import { isLocale, LOCALE_HEADER, type Locale } from './config';
import { createFormatter, type Formatter } from './format';
import { localeSettings } from './settings';

export async function getLocale(): Promise<Locale> {
  const locale = (await headers()).get(LOCALE_HEADER);
  return isLocale(locale) ? locale : localeSettings().defaultLocale;
}

export async function getFormatter(): Promise<Formatter> {
  return createFormatter(await getLocale(), localeSettings().timeZone);
}
