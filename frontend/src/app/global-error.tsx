// frontend/src/app/global-error.tsx
//
// Last resort when even the root layout fails. It replaces the whole
// document, so it brings its own <html> and plain styles.

'use client';

import { useEffect } from 'react';

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

  return (
    <html lang="fa" dir="rtl">
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
          <h1>خطای غیرمنتظره‌ای رخ داد</h1>
          <p>لطفاً صفحه را دوباره بارگذاری کنید.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}
          >
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
