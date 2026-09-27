// مسیر فایل: src/components/theme-toggle.tsx
'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="cursor-pointer">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all duration-500 dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all duration-500 dark:scale-100 dark:rotate-0" />
          <span className="sr-only">تغییر تم</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="cursor-pointer"
        >
          روشن
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="cursor-pointer"
        >
          تیره
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="cursor-pointer"
        >
          سیستم
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
