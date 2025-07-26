// src/components/layout/user-nav.tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { fetchUserProfile } from '@/lib/api/nestjs';
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
  const { token, user, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      const getUserProfile = async () => {
        const userProfile = await fetchUserProfile(token);
        if (userProfile) {
          setUser(userProfile);
        } else {
          logout();
        }
      };
      getUserProfile();
    }
    // اگر توکن حذف شد (کاربر خارج شد)، اطلاعات کاربر را هم پاک می‌کنیم
    if (!token && user) {
      setUser(null);
    }
  }, [token, user, setUser, logout]);

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" alt={user.email} />
              <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">کاربر</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* این آیتم اضافه شده است */}
          <DropdownMenuItem asChild>
            <Link href="/profile">پروفایل من</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>خروج</DropdownMenuItem>
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
