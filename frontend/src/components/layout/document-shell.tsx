// frontend/src/components/layout/document-shell.tsx
//
// The <html> document every storefront page renders in: its language and
// direction, the font, styles, theme and toasts, and the page's language
// for client components. Used by the [locale] layout and by the 404 page
// for addresses that match no route.

import { headers } from 'next/headers';
import { Inter, Vazirmatn } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import { NONCE_HEADER } from '@/lib/security-headers';
import { LOCALE_INFO, type Locale } from '@/i18n/config';
import { messagesFor } from '@/i18n/catalog';
import { I18nProvider } from '@/i18n/client';
import { localeSettings } from '@/i18n/settings';

// Latin letters and digits are set in Inter, Persian letters and digits
// in Vazirmatn, on pages in either language: the browser picks the face
// per character (globals.css puts Inter first). Inter gets no metric
// fallback, because that fallback is a system font with Persian letters,
// which would take Persian text away from Vazirmatn.
const latinFont = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  adjustFontFallback: false,
});
const persianFont = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-persian',
});

export async function DocumentShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  const { tag, dir } = LOCALE_INFO[locale];

  return (
    <html lang={tag} dir={dir} suppressHydrationWarning>
      <body
        className={cn(
          'bg-background min-h-screen font-sans antialiased',
          latinFont.variable,
          persianFont.variable,
        )}
      >
        <I18nProvider
          locale={locale}
          enabledLocales={localeSettings().enabledLocales}
          timeZone={localeSettings().timeZone}
          messages={messagesFor(locale)}
        >
          <Providers nonce={nonce}>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
