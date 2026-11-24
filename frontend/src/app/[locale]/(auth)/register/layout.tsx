// frontend/src/app/(auth)/register/layout.tsx -> the page's title; the page itself
// is a client component, which can't export metadata.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ثبت‌نام',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
