// src/components/layout/user-nav.tsx
'use client';

import { Bidi } from '@/components/ui/bidi';
import { useEffect } from 'react';
import Link from 'next/link';
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
  const { user, clear } = useAuthStore();

  // The header is on every page, so it asks the server who is logged in.
  useEffect(() => {
    void loadSession();
  }, []);
  useCartRefresh();

  const logout = async () => {
    await logoutUser();
    clear();
  };

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 cursor-pointer rounded-full"
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
              <p className="text-sm leading-none font-medium">کاربر</p>
              <p className="text-muted-foreground text-xs leading-none">
                <Bidi ltr>{user.email}</Bidi>
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* این آیتم اضافه شده است */}
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              پروفایل من
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()} className="cursor-pointer">
            خروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost">
        <Link href="/login">ورود</Link>
      </Button>
      <Button asChild>
        <Link href="/register">ثبت‌نام</Link>
      </Button>
    </div>
  );
}
