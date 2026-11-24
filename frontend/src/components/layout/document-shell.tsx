// frontend/src/components/layout/document-shell.tsx
//
// The <html> document every storefront page renders in: its language and
// direction, the font, styles, theme and toasts, and the page's language
// for client components. Used by the [locale] layout and by the 404 page
// for addresses that match no route.

import { headers } from 'next/headers';
import { Vazirmatn } from 'next/font/google';
import '@/app/globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import { NONCE_HEADER } from '@/lib/security-headers';
import { LOCALE_INFO, type Locale } from '@/i18n/config';
import { I18nProvider } from '@/i18n/client';
import { localeSettings } from '@/i18n/settings';

// Vazirmatn has both Persian and Latin letters, so English pages and
// English product names on Persian pages share one typeface.
const vazirFont = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-sans',
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
          vazirFont.variable,
        )}
      >
        <I18nProvider
          locale={locale}
          enabledLocales={localeSettings().enabledLocales}
          timeZone={localeSettings().timeZone}
        >
          <Providers nonce={nonce}>{children}</Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
