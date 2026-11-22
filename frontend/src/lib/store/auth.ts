// frontend/src/lib/store/auth.ts
//
// The customer's session as the page sees it. The login token itself never
// reaches the browser: it lives in an httpOnly cookie that only the
// storefront's server reads (see src/app/api). Nothing here is persisted.

import { create } from 'zustand';
import type { AuthUser, Cart } from '@/types';

// unknown: not checked with the server yet on this page load.
export type SessionStatus = 'unknown' | 'signed-in' | 'signed-out';

interface AuthState {
  status: SessionStatus;
  user: AuthUser | null;
  cart: Cart | null;
  setUser: (user: AuthUser | null) => void;
  setCart: (cart: Cart | null) => void;
  // Forget the customer (logged out, or the session ended).
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'unknown',
  user: null,
  cart: null,
  setUser: (user) =>
    set(
      user
        ? { user, status: 'signed-in' }
        : { user: null, cart: null, status: 'signed-out' },
    ),
  setCart: (cart) => set({ cart }),
  clear: () => set({ user: null, cart: null, status: 'signed-out' }),
}));
