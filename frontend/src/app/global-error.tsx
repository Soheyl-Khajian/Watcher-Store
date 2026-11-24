// frontend/src/app/global-error.tsx
//
// Last resort when even the root layout fails. It replaces the whole
// document, so it brings its own <html> and plain styles.

'use client';

import { useEffect } from 'react';
import { messagesFor } from '@/i18n/catalog';
import { LOCALE_INFO } from '@/i18n/config';
import { splitLocale } from '@/i18n/paths';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  // Nothing else is left to ask, so the address tells the language.
  const locale =
    (typeof window !== 'undefined' &&
      splitLocale(window.location.pathname).locale) ||
    'fa';
  const { errors, common } = messagesFor(locale);
  const { tag, dir } = LOCALE_INFO[locale];

  return (
    <html lang={tag} dir={dir}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <div role="alert">
          <h1>{errors.unexpectedTitle}</h1>
          <p>{errors.unexpectedText}</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
          >
            {common.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
