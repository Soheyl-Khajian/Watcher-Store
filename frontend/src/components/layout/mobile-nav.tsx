// مسیر فایل: src/components/layout/mobile-nav.tsx

'use client';

import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { Category } from '@/types';
import { SheetClose } from '@/components/ui/sheet';

interface MobileNavProps {
  categories: Category[];
  otherLinks: { href: string; label: string }[];
}

export function MobileNav({ categories, otherLinks }: MobileNavProps) {
  return (
    <div className="flex flex-col gap-4 py-12 px-3">
      <SheetClose asChild>
        <Link href="/" className="mb-4 font-bold">
          فروشگاه واچر
        </Link>
      </SheetClose>

      {/* بخش دسته‌بندی‌ها به صورت آکاردیونی */}
      <Accordion type="single" collapsible className="w-full">
        {categories.map((category) =>
          category.children && category.children.length > 0 ? (
            // اگر فرزند داشت، یک آیتم آکاردیونی بساز
            <AccordionItem value={category.id} key={category.id}>
              <AccordionTrigger className="text-lg">
                {category.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col space-y-2 pr-4">
                  {/* لینک به خود دسته مادر */}
                  <SheetClose asChild>
                    <Link
                      href={`/categories/${category.slug}`}
                      className="py-2 text-muted-foreground"
                    >
                      همه محصولات {category.name}
                    </Link>
                  </SheetClose>
                  {/* لیست فرزندان */}
                  {category.children.map((child) => (
                    <SheetClose asChild key={child.id}>
                      <Link
                        href={`/categories/${child.slug}`}
                        className="py-2 text-muted-foreground"
                      >
                        {child.name}
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : (
            // اگر فرزند نداشت، یک لینک ساده بساز
            <SheetClose asChild key={category.id}>
              <Link
                href={`/categories/${category.slug}`}
                className="block border-b py-4 text-lg"
              >
                {category.name}
              </Link>
            </SheetClose>
          ),
        )}
      </Accordion>

      <hr className="my-2" />

      {/* بخش لینک‌های دیگر */}
      {otherLinks.map((link) => (
        <SheetClose asChild key={link.href}>
          <Link href={link.href} className="text-lg">
            {link.label}
          </Link>
        </SheetClose>
      ))}
    </div>
  );
}
