// مسیر فایل: src/app/layout.tsx

import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils'; // ابزار کمکی از shadcn
import { Providers } from '@/components/providers';

// ۱. تنظیمات بهینه فونت وزیرمتن
const vazirFont = Vazirmatn({
  subsets: ['arabic'], // فقط حروف عربی (شامل فارسی) را بارگذاری کن
  variable: '--font-sans', // تعریف به عنوان متغیر CSS برای استفاده در Tailwind
});

// ۲. تنظیمات پیش‌فرض و کلی سئو برای کل سایت
export const metadata: Metadata = {
  title: {
    default: 'فروشگاه امنیتی واچر | تجهیزات هوشمند و دوربین مداربسته',
    template: '%s | فروشگاه امنیتی واچر', // برای صفحات داخلی عنوان را به این شکل میسازد
  },
  description:
    'خرید آنلاین انواع دوربین مداربسته، پنل خورشیدی، تجهیزات خانه هوشمند و سیستم‌های کنترل تردد با بهترین قیمت و ضمانت اصالت کالا از فروشگاه واچر.',
  keywords: [
    'دوربین مداربسته',
    'خانه هوشمند',
    'پنل خورشیدی',
    'تجهیزات امنیتی',
    'واچر',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          vazirFont.variable,
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
