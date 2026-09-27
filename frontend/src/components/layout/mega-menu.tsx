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
import { ChevronDown, ChevronLeft } from 'lucide-react';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

interface MegaMenuProps {
  categories: Category[];
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [activeParent, setActiveParent] = React.useState<Category | null>(null);
  // ۱. State جدید برای مدیریت فرزند فعال (ستون دوم)
  const [activeChild, setActiveChild] = React.useState<Category | null>(null);

  // ۲. همگام‌سازی state‌ها: وقتی والد تغییر می‌کند، فرزند فعال ریست می‌شود
  React.useEffect(() => {
    if (activeParent) {
      setActiveChild(activeParent.children?.[0] || null);
    }
  }, [activeParent]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="cursor-pointer gap-1"
          onPointerEnter={() => setActiveParent(categories?.[0] || null)}
        >
          <span>دسته‌بندی‌ها</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </PopoverTrigger>

      {/* عرض منو برای جای دادن سه ستون افزایش یافت */}
      <PopoverContent
        className="bg-background/80 w-[800px] rounded-xl border p-4 shadow-lg backdrop-blur-lg"
        align="start"
      >
        {/* ۳. چیدمان به گرید سه ستونی تغییر کرد */}
        <div className="grid grid-cols-3 gap-4">
          {/* ستون اول: دسته‌بندی‌های مادر */}
          <div className="flex flex-col space-y-1">
            {categories.map((parent) => (
              <Link
                key={parent.id}
                href={`/categories/${parent.slug}`}
                onClick={() => setOpen(false)}
                onPointerEnter={() => setActiveParent(parent)}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-between rounded-md p-3 text-right text-sm font-medium transition-colors',
                  activeParent?.id === parent.id &&
                    'bg-accent text-accent-foreground',
                )}
              >
                {parent.name}
                {parent.children && parent.children.length > 0 && (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Link>
            ))}
          </div>

          {/* ستون دوم: فرزندانِ والد فعال */}
          <div className="flex flex-col space-y-1 border-r pr-2">
            <h4 className="border-primary/20 text-primary mb-2 border-b pb-2 text-right text-base font-bold">
              {activeParent?.name}
            </h4>
            {(activeParent?.children || []).map((child) => (
              <Link
                key={child.id}
                href={`/categories/${child.slug}`}
                onClick={() => setOpen(false)}
                onPointerEnter={() => setActiveChild(child)}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center justify-between rounded-md p-3 text-right text-sm transition-colors',
                  activeChild?.id === child.id && 'bg-accent/50',
                )}
              >
                {child.name}
                {child.children && child.children.length > 0 && (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Link>
            ))}
          </div>

          {/* ستون سوم: نوه‌های والد فعال (فرزندانِ فرزند فعال) */}
          <div className="flex flex-col space-y-1 border-r pr-2">
            <h4 className="border-primary/20 text-primary pointer-events-none mb-2 border-b pb-2 text-right text-base font-bold opacity-0">
              Placeholder
            </h4>{' '}
            {/* Placeholder برای حفظ هم‌ترازی */}
            {(activeChild?.children || []).map((grandchild) => (
              <Link
                key={grandchild.id}
                href={`/categories/${grandchild.slug}`}
                onClick={() => setOpen(false)}
                className="hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md p-3 text-right text-sm transition-colors"
              >
                {grandchild.name}
              </Link>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
