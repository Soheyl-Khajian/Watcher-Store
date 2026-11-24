// frontend/src/components/layout/mega-menu.tsx
//
// The desktop category menu: three columns (categories, their
// subcategories, and those subcategories' own). Every way of using it
// reaches all three levels:
// - mouse: pointing at a category shows its subcategories;
// - keyboard: focusing a category shows them too; arrow keys move up and
//   down a column and across columns (toward the subcategories is left in
//   a right-to-left page);
// - touch: the first tap on a category with subcategories opens it, the
//   second goes to its page.

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Bidi } from '@/components/ui/bidi';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import type { Category } from '@/types';
import { cn } from '@/lib/utils';

interface MegaMenuProps {
  categories: Category[];
}

const hasChildren = (category: Category | null | undefined) =>
  !!category?.children && category.children.length > 0;

const categoryHref = (category: Category) =>
  `/categories/${encodeURIComponent(category.slug ?? '')}`;

// Moves focus between the menu's links with the arrow keys.
function moveFocus(event: React.KeyboardEvent<HTMLElement>) {
  const link = event.target as HTMLElement;
  const column = link.closest<HTMLElement>('[data-menu-column]');
  if (!column || link.tagName !== 'A') return;

  const index = Number(column.dataset.menuColumn);
  const links = [...column.querySelectorAll<HTMLElement>('a')];
  const position = links.indexOf(link);
  const rtl = getComputedStyle(column).direction === 'rtl';
  const inward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const outward = rtl ? 'ArrowRight' : 'ArrowLeft';
  const columnAt = (i: number) =>
    event.currentTarget.querySelector<HTMLElement>(`[data-menu-column="${i}"]`);

  let target: HTMLElement | null | undefined;
  switch (event.key) {
    case 'ArrowDown':
      target = links[(position + 1) % links.length];
      break;
    case 'ArrowUp':
      target = links[(position - 1 + links.length) % links.length];
      break;
    case 'Home':
      target = links[0];
      break;
    case 'End':
      target = links[links.length - 1];
      break;
    case inward:
      target = columnAt(index + 1)?.querySelector('a');
      break;
    case outward:
      target = columnAt(index - 1)?.querySelector('a[data-active="true"]');
      break;
    default:
      return;
  }
  event.preventDefault();
  target?.focus();
}

export function MegaMenu({ categories }: MegaMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [activeParent, setActiveParent] = React.useState<Category | null>(null);
  const [activeChild, setActiveChild] = React.useState<Category | null>(null);
  // Whether the last press was a touch, which hovering can't precede.
  const touch = React.useRef(false);

  const showParent = (parent: Category | null) => {
    setActiveParent(parent);
    setActiveChild(parent?.children?.[0] ?? null);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !activeParent) showParent(categories[0] ?? null);
  };

  // A tap on a closed category with subcategories opens it instead of
  // leaving the menu.
  const openOnTouch = (
    event: React.MouseEvent,
    category: Category,
    isActive: boolean,
    show: () => void,
  ) => {
    if (touch.current && hasChildren(category) && !isActive) {
      event.preventDefault();
      show();
      return;
    }
    setOpen(false);
  };

  const pointer = {
    onPointerDown: (event: React.PointerEvent) => {
      touch.current = event.pointerType !== 'mouse';
    },
  };

  const itemClass =
    'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent flex cursor-pointer items-center justify-between rounded-md p-3 text-start text-sm transition-colors';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="cursor-pointer gap-1">
          <span>دسته‌بندی‌ها</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="bg-background/80 w-[800px] rounded-xl border p-4 shadow-lg backdrop-blur-lg"
        align="start"
        onKeyDown={(event) => {
          touch.current = false;
          moveFocus(event);
        }}
        {...pointer}
      >
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col space-y-1" data-menu-column="0">
            {categories.map((parent) => {
              const isActive = activeParent?.id === parent.id;
              return (
                <Link
                  key={parent.id}
                  href={categoryHref(parent)}
                  data-active={isActive}
                  aria-haspopup={hasChildren(parent) ? 'true' : undefined}
                  aria-expanded={hasChildren(parent) ? isActive : undefined}
                  onClick={(event) =>
                    openOnTouch(event, parent, isActive, () =>
                      showParent(parent),
                    )
                  }
                  onPointerEnter={(event) =>
                    event.pointerType === 'mouse' && showParent(parent)
                  }
                  onFocus={() => !isActive && showParent(parent)}
                  className={cn(
                    itemClass,
                    'font-medium',
                    isActive && 'bg-accent text-accent-foreground',
                  )}
                >
                  <Bidi>{parent.name}</Bidi>
                  {hasChildren(parent) && (
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </div>

          <div
            className="flex flex-col space-y-1 border-s ps-2"
            data-menu-column="1"
          >
            <p className="border-primary/20 text-primary mb-2 border-b pb-2 text-start text-base font-bold">
              {activeParent && <Bidi>{activeParent.name}</Bidi>}
            </p>
            {(activeParent?.children || []).map((child) => {
              const isActive = activeChild?.id === child.id;
              return (
                <Link
                  key={child.id}
                  href={categoryHref(child)}
                  data-active={isActive}
                  aria-haspopup={hasChildren(child) ? 'true' : undefined}
                  aria-expanded={hasChildren(child) ? isActive : undefined}
                  onClick={(event) =>
                    openOnTouch(event, child, isActive, () =>
                      setActiveChild(child),
                    )
                  }
                  onPointerEnter={(event) =>
                    event.pointerType === 'mouse' && setActiveChild(child)
                  }
                  onFocus={() => setActiveChild(child)}
                  className={cn(itemClass, isActive && 'bg-accent/50')}
                >
                  <Bidi>{child.name}</Bidi>
                  {hasChildren(child) && (
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  )}
                </Link>
              );
            })}
          </div>

          <div
            className="flex flex-col space-y-1 border-s ps-2"
            data-menu-column="2"
          >
            {/* Lines this column up with the headed one beside it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none mb-2 border-b border-transparent pb-2 text-base font-bold"
            >
              &nbsp;
            </div>
            {(activeChild?.children || []).map((grandchild) => (
              <Link
                key={grandchild.id}
                href={categoryHref(grandchild)}
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                <Bidi>{grandchild.name}</Bidi>
              </Link>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
