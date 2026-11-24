// frontend/src/app/[locale]/(main)/error.tsx
//
// Shown inside the shop's header and footer when a storefront page could
// not be rendered, usually because Payload could not be reached. Offers a
// retry instead of an empty or broken page.

'use client';

import { useT } from '@/i18n/client';
import { useEffect, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const t = useT();
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  const retry = () =>
    startRetry(() => {
      // Fetch the page from the server again, then re-render it.
      router.refresh();
      reset();
    });

  return (
    <div
      role="alert"
      className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center"
    >
      <h1 className="text-2xl font-bold">{t('errors.pageFailedTitle')}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {t('errors.pageFailedText')}
      </p>
      <Button className="mt-8" onClick={retry} disabled={isRetrying}>
        {isRetrying ? t('common.retrying') : t('common.retry')}
      </Button>
      {error.digest ? (
        // Matches the server's log entry for this failure.
        <p className="text-muted-foreground mt-6 text-xs" dir="ltr">
          {error.digest}
        </p>
      ) : null}
    </div>
  );
}
