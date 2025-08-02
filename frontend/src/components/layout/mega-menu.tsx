// مسیر فایل: src/components/layout/mega-menu.tsx

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import type { Category } from '@/types';

interface MegaMenuProps {
  categories: Category[];
}

export function MegaMenu({ categories }: MegaMenuProps) {
  // ۱. state برای کنترل باز و بسته بودن منو
  const [open, setOpen] = React.useState(false);

  const [activeParent, setActiveParent] = React.useState<Category | null>(
    categories?.[0] || null,
  );

  const activeChildren = activeParent?.children || [];

  return (
    // ۲. Popover را به state متصل می‌کنیم
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-1 cursor-pointer">
          <span>دسته‌بندی‌ها</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[600px] p-4 border rounded-xl shadow-lg bg-background/80 backdrop-blur-lg"
        align="start"
      >
        <div className="flex gap-4">
          <div className="flex w-[200px] flex-col space-y-1">
            {categories.map((parent) => (
              <Link
                key={parent.id}
                href={`/categories/${parent.slug}`}
                // ۳. با کلیک روی هر لینک، منو بسته می‌شود
                onClick={() => setOpen(false)}
                onPointerEnter={() => setActiveParent(parent)}
                className={`rounded-md p-3 text-sm font-medium transition-colors text-right hover:bg-accent hover:text-accent-foreground cursor-pointer
                  ${
                    activeParent?.id === parent.id
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }`}
              >
                {parent.name}
              </Link>
            ))}
          </div>

          <div className="flex-1">
            <h4 className="mb-4 border-b border-primary/20 pb-2 text-lg font-bold text-primary text-right">
              {activeParent?.name}
            </h4>
            <div className="flex flex-col space-y-1">
              {activeChildren.length > 0 ? (
                activeChildren.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    // ۳. با کلیک روی هر لینک، منو بسته می‌شود
                    onClick={() => setOpen(false)}
                    className="block rounded-md p-3 text-sm hover:bg-accent hover:text-accent-foreground text-right cursor-pointer"
                  >
                    {child.name}
                  </Link>
                ))
              ) : (
                <p className="p-3 text-sm text-muted-foreground text-right">
                  این دسته زیرمجموعه‌ای ندارد.
                </p>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
