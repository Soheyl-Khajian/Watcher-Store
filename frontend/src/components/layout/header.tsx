// مسیر فایل: src/components/layout/header.tsx
import Link from 'next/link';
import { Menu } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/theme-toggle';
import { UserNav } from './user-nav';
import { CartSheet } from './cart-sheet';
import { MegaMenu } from './mega-menu';
import { MobileNav } from './mobile-nav';
import { fetchCategoryTree } from '@/lib/api/payload';

const otherNavLinks = [
  { href: '/blog', label: 'وبلاگ' },
  { href: '/about-us', label: 'درباره ما' },
  { href: '/contact-us', label: 'تماس با ما' },
];

export async function Header() {
  const categoryTree = await fetchCategoryTree();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-2">
        {/* بخش لوگوی سایت با لینک به صفحه اصلی */}
        <div className="mr-4 ml-10 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* <Icons.logo className="h-6 w-6" /> */}
            <span className="hidden font-bold sm:inline-block">
              فروشگاه واچر
            </span>
          </Link>
        </div>

        {/* منوی اصلی برای دسکتاپ */}
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {/* کامپوننت منوی داینامیک */}
          <MegaMenu categories={categoryTree} />

          {/* بقیه لینک‌های ثابت */}
          {otherNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* منوی همبرگری برای موبایل */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">باز کردن منو</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              {/* عنوان و توضیحات را اضافه می‌کنیم اما با کلاس فقط صفحه خوان آنها را مخفی می‌کنیم */}
              <SheetHeader>
                <SheetTitle className="sr-only">منو</SheetTitle>
                <SheetDescription className="sr-only">
                  ناوبری اصلی سایت
                </SheetDescription>
              </SheetHeader>
              <MobileNav categories={categoryTree} otherLinks={otherNavLinks} />
            </SheetContent>
          </Sheet>
        </div>

        {/* دکمه تغییر تم و بخش کاربر در سمت چپ */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ModeToggle />
          <UserNav />
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
