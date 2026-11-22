// src/components/providers.tsx
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

// nonce: the page's CSP nonce, for next-themes' inline script that sets the
// theme before the page paints.
export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark" // تم پیش‌فرض شما
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
      <Toaster richColors />
    </ThemeProvider>
  );
}
