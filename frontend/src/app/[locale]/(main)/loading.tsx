// frontend/src/app/[locale]/(main)/loading.tsx
//
// Shown in place of the page while the next one renders on the server
// (every storefront page waits for the CMS), so a click answers at once.
// The header and footer stay.

import { getT } from '@/i18n/server';

export default async function Loading() {
  const t = await getT();
  return (
    <div role="status" className="container mx-auto px-4 py-12">
      <span className="sr-only">{t('common.loading')}</span>
      <div aria-hidden="true" className="animate-pulse space-y-8">
        <div className="bg-muted h-9 w-56 rounded-md" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="space-y-3">
              <div className="bg-muted aspect-[4/3] rounded-xl" />
              <div className="bg-muted h-4 w-3/4 rounded" />
              <div className="bg-muted h-4 w-1/2 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
