// frontend/src/components/search/product-search-form.tsx
//
// Product search: a plain GET form to /products?q=..., so it works with
// Enter, the search button, and without JavaScript.

import { Search } from 'lucide-react';
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
  return (
    <form
      action="/products"
      method="get"
      role="search"
      className={cn('relative', className)}
    >
      <label htmlFor="product-search" className="sr-only">
        جستجوی محصول
      </label>
      <Input
        id="product-search"
        type="search"
        name="q"
        defaultValue={defaultValue}
        maxLength={SEARCH_MAX_LENGTH}
        placeholder="دنبال چه محصولی می‌گردی؟"
        className="h-12 rounded-full ps-4 pe-12 text-base"
      />
      <button
        type="submit"
        aria-label="جستجو"
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 end-0 flex items-center px-4"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </button>
    </form>
  );
}
