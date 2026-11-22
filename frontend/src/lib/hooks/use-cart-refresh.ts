// frontend/src/lib/hooks/use-cart-refresh.ts
//
// Reloads the cart when the customer comes back to this tab, so changes
// made in another tab or device (or an order placed there) show up. At
// most once every 30 seconds.

'use client';

import { useEffect } from 'react';
import { syncCart } from '../api/nestjs';
import { useAuthStore } from '../store/auth';

const MIN_INTERVAL_MS = 30_000;

export function useCartRefresh(): void {
  useEffect(() => {
    let lastRefresh = Date.now();

    const onVisible = () => {
      if (
        document.visibilityState !== 'visible' ||
        useAuthStore.getState().status !== 'signed-in' ||
        Date.now() - lastRefresh < MIN_INTERVAL_MS
      ) {
        return;
      }
      lastRefresh = Date.now();
      void syncCart();
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
