// frontend/src/i18n/settings.ts
//
// Per-deployment language settings, read at run time so one image serves
// any deployment:
//
//   DEFAULT_LOCALE   the language a bare address opens in (default: fa)
//   ENABLED_LOCALES  comma-separated languages offered (default: all)
//   STORE_TIME_ZONE  the time zone order and post times show in
//                    (default: Asia/Tehran)
//
// A wrong value stops the storefront instead of serving a half-working
// language.

import { isLocale, LOCALES, type Locale } from './config';

export interface LocaleSettings {
  defaultLocale: Locale;
  enabledLocales: Locale[];
  timeZone: string;
}

export function parseLocaleSettings(env: {
  DEFAULT_LOCALE?: string;
  ENABLED_LOCALES?: string;
  STORE_TIME_ZONE?: string;
}): LocaleSettings {
  const defaultLocale = env.DEFAULT_LOCALE?.trim() || 'fa';
  if (!isLocale(defaultLocale)) {
    throw new Error(
      `DEFAULT_LOCALE must be one of ${LOCALES.join(', ')}; got "${defaultLocale}".`,
    );
  }

  const listed = (env.ENABLED_LOCALES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const value of listed) {
    if (!isLocale(value)) {
      throw new Error(
        `ENABLED_LOCALES may contain ${LOCALES.join(', ')}; got "${value}".`,
      );
    }
  }
  const enabledLocales = listed.length
    ? LOCALES.filter((locale) => listed.includes(locale))
    : [...LOCALES];

  if (!enabledLocales.includes(defaultLocale)) {
    throw new Error(
      `DEFAULT_LOCALE (${defaultLocale}) must be one of ENABLED_LOCALES (${enabledLocales.join(', ')}).`,
    );
  }

  const timeZone = env.STORE_TIME_ZONE?.trim() || 'Asia/Tehran';
  try {
    new Intl.DateTimeFormat('en', { timeZone });
  } catch {
    throw new Error(
      `STORE_TIME_ZONE must be an IANA time zone such as Asia/Tehran; got "${timeZone}".`,
    );
  }

  return { defaultLocale, enabledLocales, timeZone };
}

let cached: LocaleSettings | undefined;

export function localeSettings(): LocaleSettings {
  cached ??= parseLocaleSettings({
    DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
    ENABLED_LOCALES: process.env.ENABLED_LOCALES,
    STORE_TIME_ZONE: process.env.STORE_TIME_ZONE,
  });
  return cached;
}
