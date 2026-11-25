// frontend/src/components/errors/not-found-content.tsx
//
// The 404 message, shared by the storefront's not-found pages.

'use client';

import { useFormatter, useT } from '@/i18n/client';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export function NotFoundContent() {
  const t = useT();
  const format = useFormatter();
  return (
    <div className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-primary text-6xl font-bold" aria-hidden="true">
        {format.digits(404)}
      </p>
      <h1 className="mt-4 text-2xl font-bold">{t('errors.notFoundHeading')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {t('errors.notFoundText')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">{t('nav.home')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">{t('nav.allProducts')}</Link>
        </Button>
      </div>
    </div>
  );
}
