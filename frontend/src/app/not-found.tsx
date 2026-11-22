// frontend/src/app/not-found.tsx
//
// Addresses that match no route at all (for example /a/b/c).

import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/errors/not-found-content';

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center">
      <NotFoundContent />
    </main>
  );
}
