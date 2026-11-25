// frontend/src/lib/hooks/use-require-session.ts
//
// For account pages: once the session check says nobody is logged in (the
// cookie was missing, expired or revoked), go to the login page and come
// back afterwards, instead of waiting forever for data that will not come.

'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore, type SessionStatus } from '../store/auth';
import { loginPathFor } from '../utils/safe-next';

export function useRequireSession(): SessionStatus {
  const status = useAuthStore((state) => state.status);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'signed-out') {
      router.replace(loginPathFor(pathname + window.location.search));
    }
  }, [status, router, pathname]);

  return status;
}
