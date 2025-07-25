// lib/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// تعریف ساختار داده‌های کاربر و توکن
interface AuthState {
  token: string | null;
  user: any | null; // در آینده می‌توانیم این را با یک نوع دقیق‌تر جایگزین کنیم
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

// ساخت store با قابلیت ذخیره‌سازی در localStorage
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'auth-storage', // نامی که در localStorage استفاده می‌شود
    },
  ),
);
