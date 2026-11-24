// frontend/src/components/layout/header.tsx
import type { MessageKey } from '@/i18n/messages';
import { getT } from '@/i18n/server';
import { Link } from '@/i18n/navigation';
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
import { LogoMark } from '@/components/brand/logo';

const NAV_LINKS: { href: string; label: MessageKey }[] = [
  { href: '/products', label: 'nav.allProducts' },
  { href: '/products?onSale=true', label: 'nav.specials' },
  { href: '/blog', label: 'nav.blog' },
  { href: '/about-us', label: 'nav.about' },
  { href: '/contact-us', label: 'nav.contact' },
];

export async function Header() {
  // Without Payload the page still renders, without the category menu.
  const [categoryTree, t] = await Promise.all([
    fetchCategoryTree().catch(() => []),
    getT(),
  ]);
  const navLinks = NAV_LINKS.map(({ href, label }) => ({
    href,
    label: t(label),
  }));

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center px-2">
        <div className="ms-4 me-10 hidden md:flex">
          <Link href="/" className="ms-6 flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="hidden font-bold sm:inline-block">
              {t('site.shortName')}
            </span>
          </Link>
        </div>

        {/* Main menu, from tablets up. */}
        <nav
          aria-label={t('nav.main')}
          className="hidden items-center gap-6 text-sm font-medium md:flex"
        >
          <MegaMenu categories={categoryTree} />

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground/80 text-foreground/60 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* The menu sheet on phones. */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('nav.openMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              {/* A title and description for screen readers only. */}
              <SheetHeader>
                <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                <SheetDescription className="sr-only">
                  {t('nav.menuDescription')}
                </SheetDescription>
              </SheetHeader>
              <MobileNav categories={categoryTree} links={navLinks} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Theme, account and cart, at the end of the bar. */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          <ModeToggle />
          <UserNav />
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
