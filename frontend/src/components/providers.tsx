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
      {/* Top centre, below the sticky header (4rem): sheets keep their
          actions at the bottom, such as the cart's checkout button, and a
          toast there would cover them. */}
      <Toaster
        richColors
        position="top-center"
        offset={{ top: 72 }}
        mobileOffset={{ top: 72 }}
      />
    </ThemeProvider>
  );
}
