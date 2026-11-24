// frontend/src/components/layout/mobile-nav.tsx
//
// The menu sheet on small screens: the category tree at any depth (a
// category with subcategories opens like an accordion and starts with a
// link to all of its products), then the shop's other pages.

'use client';

import { useT } from '@/i18n/client';
import { Bidi } from '@/components/ui/bidi';
import { Link } from '@/i18n/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Category } from '@/types';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  categories: Category[];
  links: { href: string; label: string }[];
}

const categoryHref = (category: Category) =>
  `/categories/${encodeURIComponent(category.slug ?? '')}`;

function CategoryList({
  categories,
  depth,
}: {
  categories: Category[];
  depth: number;
}) {
  const t = useT();
  const top = depth === 0;

  return (
    <Accordion type="single" collapsible className="w-full">
      {categories.map((category) =>
        category.children && category.children.length > 0 ? (
          <AccordionItem
            value={String(category.id)}
            key={category.id}
            className={cn(!top && 'border-b-0')}
          >
            <AccordionTrigger
              className={cn(
                top ? 'text-lg' : 'text-muted-foreground py-2 text-base',
              )}
            >
              <Bidi>{category.name}</Bidi>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col ps-4">
                <SheetClose asChild>
                  <Link
                    href={categoryHref(category)}
                    className="text-muted-foreground py-2"
                  >
                    {t.rich('nav.allInCategory', {
                      name: <Bidi>{category.name}</Bidi>,
                    })}
                  </Link>
                </SheetClose>
                <CategoryList
                  categories={category.children}
                  depth={depth + 1}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : (
          <SheetClose asChild key={category.id}>
            <Link
              href={categoryHref(category)}
              className={cn(
                'block',
                top ? 'border-b py-4 text-lg' : 'text-muted-foreground py-2',
              )}
            >
              <Bidi>{category.name}</Bidi>
            </Link>
          </SheetClose>
        ),
      )}
    </Accordion>
  );
}

export function MobileNav({ categories, links }: MobileNavProps) {
  const t = useT();
  return (
    <nav aria-label={t('nav.main')} className="flex flex-col gap-4 px-3 py-12">
      <SheetClose asChild>
        <Link href="/" className="mb-4 font-bold">
          {t('site.shortName')}
        </Link>
      </SheetClose>

      <CategoryList categories={categories} depth={0} />

      <hr className="my-2" />

      {links.map((link) => (
        <SheetClose asChild key={link.href}>
          <Link href={link.href} className="text-lg">
            {link.label}
          </Link>
        </SheetClose>
      ))}
    </nav>
  );
}
