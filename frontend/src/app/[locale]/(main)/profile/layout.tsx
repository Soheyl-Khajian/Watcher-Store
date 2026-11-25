// frontend/src/app/[locale]/(main)/profile/layout.tsx -> the page's title; the page itself
// is a client component, which can't export metadata.

import type { Metadata } from 'next';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('profile.title'),
    robots: { index: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
