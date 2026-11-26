// frontend/src/components/ui/breadcrumbs.tsx
//
// The page's place in the shop (Home > category > product). Every step but
// the last is a link; the last is the current page.

import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { Link } from '@/i18n/navigation';
import { Bidi } from '@/components/ui/bidi';

export interface Crumb {
  name: string;
  // A storefront path without the language prefix.
  path: string;
}

export async function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  const t = await getT();
  return (
    <nav aria-label={t('nav.breadcrumb')} className={className}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  <Bidi>{item.name}</Bidi>
                </span>
              ) : (
                <>
                  <Link
                    href={item.path}
                    className="hover:text-foreground underline-offset-4 hover:underline"
                  >
                    <Bidi>{item.name}</Bidi>
                  </Link>
                  {/* Points onwards: left in right-to-left pages. */}
                  <ChevronLeft
                    aria-hidden="true"
                    className="h-4 w-4 ltr:-scale-x-100"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
