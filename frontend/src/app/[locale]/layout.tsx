// frontend/src/app/[locale]/layout.tsx
//
// Every page, in its language: /fa/..., /en/... A language this deployment
// doesn't offer (ENABLED_LOCALES) is a 404.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocumentShell } from '@/components/layout/document-shell';
import { isLocale } from '@/i18n/config';
import { localeSettings } from '@/i18n/settings';
import {
  OPEN_GRAPH_DEFAULTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from '@/lib/seo';

// Every page is rendered per request: the Content-Security-Policy carries a
// new nonce each time (middleware.ts), and a page built ahead of time would
// have scripts without it, which the browser refuses to run.
export const dynamic = 'force-dynamic';

// Defaults for every page; pages add their own title, description and
// images. URLs in metadata are made absolute against the storefront's
// public address.
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: `${SITE_NAME} | تجهیزات هوشمند و دوربین مداربسته`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'دوربین مداربسته',
    'خانه هوشمند',
    'پنل خورشیدی',
    'تجهیزات امنیتی',
    'واچر',
  ],
  openGraph: OPEN_GRAPH_DEFAULTS,
  twitter: { card: 'summary_large_image' },
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale) || !localeSettings().enabledLocales.includes(locale)) {
    notFound();
  }

  return <DocumentShell locale={locale}>{children}</DocumentShell>;
}
