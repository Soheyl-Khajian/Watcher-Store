// frontend/src/i18n/navigation.tsx
//
// Links and navigation that stay in the page's language. Components write
// paths without a prefix ("/products"); these add it ("/en/products").
// Use them instead of next/link and next/navigation's router and pathname.

'use client';

import NextLink from 'next/link';
import {
  usePathname as useNextPathname,
  useRouter as useNextRouter,
} from 'next/navigation';
import { forwardRef, useMemo, type ComponentProps } from 'react';
import { useLocale } from './client';
import { localizeHref, splitLocale } from './paths';

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & {
  href: string;
};

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, ...props },
  ref,
) {
  const locale = useLocale();
  return <NextLink ref={ref} href={localizeHref(locale, href)} {...props} />;
});

export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) =>
        router.push(localizeHref(locale, href), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localizeHref(locale, href), options),
      prefetch: (href: string) => router.prefetch(localizeHref(locale, href)),
    }),
    [router, locale],
  );
}

// The current path without its language prefix ("/en/products" ->
// "/products"), as components compare and pass it around.
export function usePathname(): string {
  return splitLocale(useNextPathname() ?? '/').path;
}
