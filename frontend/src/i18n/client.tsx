// frontend/src/i18n/client.tsx
//
// The page's language for client components: the [locale] layout provides
// it, components read it with useLocale().

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Locale } from './config';

interface I18nContextValue {
  locale: Locale;
  // The languages this deployment offers, for the language switcher.
  enabledLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  enabledLocales,
  children,
}: I18nContextValue & { children?: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, enabledLocales }}>
      {children}
    </I18nContext.Provider>
  );
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
