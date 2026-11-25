// frontend/src/app/not-found.tsx
//
// Addresses that match no page in any language, such as /en/... on a
// deployment that offers only Persian. Shown in the default language.

import { getT } from '@/i18n/server';
import type { Metadata } from 'next';
import { NotFoundContent } from '@/components/errors/not-found-content';
import { DocumentShell } from '@/components/layout/document-shell';
import { localeSettings } from '@/i18n/settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('errors.notFoundTitle'), robots: { index: false } };
}

export default function NotFound() {
  return (
    <DocumentShell locale={localeSettings().defaultLocale}>
      <main className="flex min-h-screen items-center">
        <NotFoundContent />
      </main>
    </DocumentShell>
  );
}
