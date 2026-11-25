// frontend/src/app/[locale]/(auth)/login/layout.tsx -> the page's title; the page itself
// is a client component, which can't export metadata.

import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('account.login'),
    robots: { index: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
