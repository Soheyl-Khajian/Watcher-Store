// frontend/src/app/(main)/checkout/layout.tsx -> the page's title; the page itself
// is a client component, which can't export metadata.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسویه حساب',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
