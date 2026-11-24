// frontend/src/app/[locale]/(main)/not-found.tsx
//
// A product, post, category or page that does not exist (notFound() in the
// storefront pages), shown with the shop's header and footer.

import { getT } from '@/i18n/server';
import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/errors/not-found-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('errors.notFoundTitle'), robots: { index: false } };
}

export default function NotFound() {
  return <NotFoundContent />;
}
