// مسیر فایل: src/components/layout/header.tsx
import Link from 'next/link';
import { Menu } from 'lucide-react';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme-toggle';

const mainNavLinks = [
  { href: '/shop', label: 'فروشگاه' },
  { href: '/blog', label: 'وبلاگ' },
  { href: '/about-us', label: 'درباره ما' },
  { href: '/contact-us', label: 'تماس با ما' },
];

export function Header() {
  return (
    // ۱. تگ header برای سئوی بهتر
    <header className="sticky top-0 z-5 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-2">
        {/* ۲. لوگوی سایت با لینک به صفحه اصلی */}
        <div className="mr-4 ml-10 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* <Icons.logo className="h-6 w-6" /> */}
            <span className="hidden font-bold sm:inline-block">
              فروشگاه واچر
            </span>
          </Link>
        </div>

        {/* ۳. منوی اصلی برای دسکتاپ (در موبایل مخفی است) */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {mainNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ۴. منوی همبرگری برای موبایل (در دسکتاپ مخفی است) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">باز کردن منو</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 py-12 px-3">
                <Link href="/" className="mb-4 font-bold">
                  فروشگاه واچر
                </Link>
                {mainNavLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg">
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* ۵. دکمه تغییر تم و سبد خرید در سمت چپ */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ModeToggle />
          {/* دکمه سبد خرید در مراحل بعدی اضافه می شود */}
        </div>
      </div>
    </header>
  );
}
