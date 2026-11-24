// frontend/src/components/auth/auth-form-parts.tsx
//
// Pieces shared by the login and register pages.

'use client';

import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { safeNextPath } from '@/lib/utils/safe-next';

// A link to the other auth page that keeps ?next=, so the customer still
// ends up where they were going.
export function AuthSwitchLink({
  href,
  children,
}: {
  href: '/login' | '/register';
  children: ReactNode;
}) {
  const next = useSearchParams().get('next');
  const target = next
    ? `${href}?next=${encodeURIComponent(safeNextPath(next))}`
    : href;
  return (
    <Link href={target} className="text-primary font-medium underline">
      {children}
    </Link>
  );
}

// A labelled field with its error message, wired for screen readers.
export function AuthField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// The server's answer when the form was refused (wrong password, taken
// email, service down), announced to screen readers.
export function AuthAlert({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
    >
      {message}
    </p>
  );
}

// Props for an input whose field may carry an error.
export function fieldA11y(id: string, error?: string) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  };
}
