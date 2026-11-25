// frontend/src/lib/hooks/use-finish-login.ts
//
// After a successful login (or registration, which logs in too): remember
// who is logged in, load their cart, and go back to the page that asked
// for a login, or home.

'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { syncCart } from '../api/nestjs';
import { useAuthStore } from '../store/auth';
import type { AuthUser } from '@/types';
import { safeNextPath } from '../utils/safe-next';

// The ?next= of the current page, kept when moving between login and
// register.
export function currentNextParam(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return new URLSearchParams(window.location.search).get('next');
}

export function useFinishLogin(): (user: AuthUser) => Promise<void> {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  return useCallback(
    async (user: AuthUser) => {
      setUser(user);
      await syncCart();
      router.push(safeNextPath(currentNextParam()));
    },
    [router, setUser],
  );
}
