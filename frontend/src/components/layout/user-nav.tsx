// frontend/src/components/layout/user-nav.tsx
'use client';

import { useT } from '@/i18n/client';
import { Bidi } from '@/components/ui/bidi';
import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { loadSession, logoutUser } from '@/lib/api/nestjs';
import { useCartRefresh } from '@/lib/hooks/use-cart-refresh';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserNav() {
  const { user, status, clear } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  // Back to this page after logging in or registering.
  const next =
    pathname && !['/login', '/register'].includes(pathname)
      ? `?next=${encodeURIComponent(pathname)}`
      : '';

  // The header is on every page, so it asks the server who is logged in.
  // If the storefront server cannot answer, it asks again, waiting a
  // little longer each time (up to a minute).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = async (attempt: number) => {
      await loadSession();
      if (cancelled || useAuthStore.getState().status !== 'unknown') return;
      const delay = Math.min(60_000, 2_000 * 2 ** attempt);
      timer = setTimeout(() => void check(attempt + 1), delay);
    };
    void check(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  useCartRefresh();

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      clear();
      // Account pages would otherwise send the customer to the login page.
      router.push('/');
    }
  };

  // Not known yet: keep the space, so the header does not jump and a
  // logged-in customer is not offered a login.
  if (status === 'unknown') {
    return (
      <div
        aria-hidden="true"
        className="bg-muted h-8 w-8 animate-pulse rounded-full motion-reduce:animate-none"
      />
    );
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 cursor-pointer rounded-full"
            aria-label={t('account.menu')}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={user.email} />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 cursor-pointer"
          align="end"
          forceMount
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm leading-none font-medium">
                {t('account.user')}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                <Bidi ltr>{user.email}</Bidi>
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              {t('account.profile')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
            {t('account.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href={`/login${next}`}>{t('account.login')}</Link>
      </Button>
      {/* On phones the login page links to registration; the bar has no
          room for both. */}
      <Button asChild className="hidden sm:inline-flex">
        <Link href={`/register${next}`}>{t('account.register')}</Link>
      </Button>
    </div>
  );
}
