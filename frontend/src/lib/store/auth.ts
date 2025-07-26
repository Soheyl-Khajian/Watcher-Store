// lib/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@/types';

interface AuthState {
  token: string | null;
  user: any | null;
  cart: Cart | null;
  setToken: (token: string | null) => void; // می‌تواند null هم باشد
  setUser: (user: any | null) => void; // می‌تواند null هم باشد
  setCart: (cart: Cart | null) => void; // <-- تغییر اصلی اینجاست
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      cart: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      setCart: (cart) => set({ cart }),
      logout: () => set({ token: null, user: null, cart: null }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);
