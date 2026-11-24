// frontend/src/components/search/product-search-form.tsx
//
// Product search: a plain GET form to /products?q=..., so it works with
// Enter, the search button, and without JavaScript.

'use client';

import { Search } from 'lucide-react';
import { useLocale, useT } from '@/i18n/client';
import { localizeHref } from '@/i18n/paths';
import { Input } from '@/components/ui/input';
import { SEARCH_MAX_LENGTH } from '@/lib/utils/search';
import { cn } from '@/lib/utils';

export function ProductSearchForm({
  defaultValue = '',
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useT();
  return (
    <form
      action={localizeHref(locale, '/products')}
      method="get"
      role="search"
      className={cn('relative', className)}
    >
      <label htmlFor="product-search" className="sr-only">
        {t('search.label')}
      </label>
      <Input
        id="product-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder={t('search.placeholder')}
        className="h-12 rounded-full ps-4 pe-12 text-base"
      />
      <button
        type="submit"
        aria-label={t('search.submit')}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center px-4"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}
