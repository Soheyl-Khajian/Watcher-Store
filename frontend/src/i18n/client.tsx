// frontend/src/i18n/client.tsx
//
// The page's language for client components: the document shell provides
// it, components read it with useLocale(), word text with useT() and
// format numbers and dates with useFormatter().
// Server components use i18n/server.ts instead.

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Locale } from './config';
import { createFormatter, type Formatter } from './format';
import { createTranslator, type Messages, type Translate } from './messages';

interface I18nContextValue {
  locale: Locale;
  // The languages this deployment offers, for the language switcher.
  enabledLocales: Locale[];
  // The store's time zone (STORE_TIME_ZONE).
  timeZone?: string;
  // This page's language's messages.
  messages: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  enabledLocales,
  timeZone = 'Asia/Tehran',
  messages,
  children,
}: I18nContextValue & { children?: ReactNode }) {
  const value = useMemo(
    () => ({ locale, enabledLocales, timeZone, messages }),
    [locale, enabledLocales, timeZone, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useLocale() must be used inside <I18nProvider>.');
  }
  return value;
}

export function useLocale(): Locale {
  return useI18n().locale;
}

export function useEnabledLocales(): Locale[] {
  return useI18n().enabledLocales;
}

export function useFormatter(): Formatter {
  const { locale, timeZone } = useI18n();
  return useMemo(
    () => createFormatter(locale, timeZone ?? 'Asia/Tehran'),
    [locale, timeZone],
  );
}

export function useT(): Translate {
  const { locale, messages } = useI18n();
  const format = useFormatter();
  return useMemo(
    () => createTranslator(locale, messages, format),
    [locale, messages, format],
  );
}
