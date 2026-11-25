// frontend/src/components/layout/language-switcher.tsx
//
// Switches the page to another language this deployment offers, keeping
// the page and its query. Each language is named in itself. Hidden when the
// deployment offers only one.

'use client';

import { Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEnabledLocales, useLocale, useT } from '@/i18n/client';
import { LOCALE_INFO } from '@/i18n/config';
import { usePathname } from '@/i18n/navigation';
import { localizeHref } from '@/i18n/paths';

export function LanguageSwitcher() {
  const locale = useLocale();
  const locales = useEnabledLocales();
  const pathname = usePathname();
  const t = useT();

  if (locales.length < 2) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="cursor-pointer">
          <Languages className="h-[1.2rem] w-[1.2rem]" aria-hidden="true" />
          <span className="sr-only">{t('nav.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((other) => (
          <DropdownMenuItem key={other} asChild className="cursor-pointer">
            {/* A full page load: the document's language and direction
                change with it. */}
            <a
              href={localizeHref(other, pathname)}
              lang={LOCALE_INFO[other].tag}
              aria-current={other === locale ? 'true' : undefined}
              onClick={(event) => {
                // Keeps the query (a search, a page number).
                event.preventDefault();
                window.location.assign(
                  localizeHref(other, pathname + window.location.search),
                );
              }}
            >
              {LOCALE_INFO[other].label}
              {other === locale ? (
                <Check className="ms-auto h-4 w-4" aria-hidden="true" />
              ) : null}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
