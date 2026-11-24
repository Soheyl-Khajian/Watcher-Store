// frontend/src/components/ui/pager.tsx
//
// Page navigation for product and category listings. Previous/next are
// real links only when there is somewhere to go (never href="#"), the
// current page is marked for screen readers, and digits are Persian.

import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { pageWindow } from '@/lib/utils/pagination';

const faNumber = (n: number) =>
  n.toLocaleString('fa-IR', { useGrouping: false });

export function Pager({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }
  const current = Math.min(Math.max(1, page), totalPages);
  const stepClass = cn(buttonVariants({ variant: 'ghost' }), 'gap-1 px-3');
  const disabledClass = cn(stepClass, 'pointer-events-none opacity-40');

  return (
    <nav aria-label="صفحه‌بندی" className="mx-auto flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {current > 1 ? (
            <Link href={hrefFor(current - 1)} rel="prev" className={stepClass}>
              {/* Right-to-left: "previous" points right. */}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              قبلی
            </Link>
          ) : (
            <span aria-disabled="true" className={disabledClass}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              قبلی
            </span>
          )}
        </li>

        {pageWindow(current, totalPages).map((item, i) =>
          item === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-2">
              …
            </li>
          ) : (
            <li key={item}>
              {item === current ? (
                <span
                  aria-current="page"
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'icon',
                  })}
                >
                  {faNumber(item)}
                </span>
              ) : (
                <Link
                  href={hrefFor(item)}
                  aria-label={`صفحه ${faNumber(item)}`}
                  className={buttonVariants({ variant: 'ghost', size: 'icon' })}
                >
                  {faNumber(item)}
                </Link>
              )}
            </li>
          ),
        )}

        <li>
          {current < totalPages ? (
            <Link href={hrefFor(current + 1)} rel="next" className={stepClass}>
              بعدی
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span aria-disabled="true" className={disabledClass}>
              بعدی
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
