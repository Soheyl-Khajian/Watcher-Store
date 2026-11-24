// frontend/src/components/ui/bidi.tsx
//
// <Bidi>{product.name}</Bidi> inside a sentence: the text takes its own
// direction and its neighbours stay where they belong (lib/bidi.ts has the
// rules). <Bidi ltr> for values that are always left to right: emails,
// SKUs, tracking codes, phone numbers.

import type { ReactNode } from 'react';

export function Bidi({
  children,
  ltr = false,
  className,
}: {
  children: ReactNode;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <bdi dir={ltr ? 'ltr' : undefined} className={className}>
      {children}
    </bdi>
  );
}
