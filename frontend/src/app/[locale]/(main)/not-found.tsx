// frontend/src/app/(main)/not-found.tsx
//
// A product, post, category or page that does not exist (notFound() in the
// storefront pages), shown with the shop's header and footer.

import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/errors/not-found-content';

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  robots: { index: false },
};

export default function NotFound() {
  return <NotFoundContent />;
}
