// مسیر فایل: src/app/layout.tsx

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils'; // ابزار کمکی از shadcn
import { Providers } from '@/components/providers';
import {
  OPEN_GRAPH_DEFAULTS,
  SITE_DESCRIPTION,
  SITE_NAME,
  siteUrl,
} from '@/lib/seo';
import { NONCE_HEADER } from '@/lib/security-headers';

// ۱. تنظیمات بهینه فونت وزیرمتن
const vazirFont = Vazirmatn({
  subsets: ['arabic'], // فقط حروف عربی (شامل فارسی) را بارگذاری کن
  variable: '--font-sans', // تعریف به عنوان متغیر CSS برای استفاده در Tailwind
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={cn(
          'bg-background min-h-screen font-sans antialiased',
          vazirFont.variable,
        )}
      >
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
