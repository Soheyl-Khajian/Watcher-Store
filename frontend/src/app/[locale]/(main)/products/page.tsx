// frontend/src/app/[locale]/(main)/products/page.tsx
import { getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import { Link } from '@/i18n/navigation';
import { fetchAllProducts } from '@/lib/api/payload';
import { ProductSearchForm } from '@/components/search/product-search-form';
import { normalizeSearchQuery } from '@/lib/utils/search';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { Pager } from '@/components/ui/pager';
import type { Metadata } from 'next';

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; onSale?: string }>;
}): Promise<Metadata> {
  const awaited = await searchParams;
  const t = await getT();
  if (normalizeSearchQuery(awaited?.q)) {
    return { title: t('products.searchTitle'), robots: { index: false } };
  }
  return awaited?.onSale === 'true'
    ? {
        title: t('products.specialsTitle'),
        alternates: { canonical: '/products?onSale=true' },
      }
    : {
        title: t('products.allTitle'),
        alternates: { canonical: '/products' },
      };
}

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; onSale?: string; q?: string }>;
}) {
  const awaitedSearchParams = await searchParams;
  const page = Number(awaitedSearchParams?.page) || 1;
  const onSale = awaitedSearchParams?.onSale === 'true';
  const search = normalizeSearchQuery(awaitedSearchParams?.q);

  const data = await fetchAllProducts({ page, limit: 15, onSale, search });

  const products = data?.docs || [];
  const totalPages = data?.totalPages || 1;
  const totalDocs: number = data?.totalDocs ?? 0;
  const t = await getT();
  const pageTitle = search
    ? t('products.searchHeading', { query: search })
    : onSale
      ? t('products.specialsHeading')
      : t('products.allTitle');

  // The listing's address without its page; the pager adds that.
  const listHref = (() => {
    const params = new URLSearchParams();
    if (onSale) {
      params.set('onSale', 'true');
    }
    if (search) {
      params.set('q', search);
    }
    const query = params.toString();
    return query ? `/products?${query}` : '/products';
  })();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">{pageTitle}</h1>
          {search && products.length > 0 ? (
            <p className="text-muted-foreground mt-2" role="status">
              {t('products.found', { count: totalDocs })}
            </p>
          ) : null}
        </div>
        <ProductSearchForm
          key={search}
          defaultValue={search}
          className="w-full md:max-w-sm"
        />
      </div>
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-12">
            <Pager page={page} totalPages={totalPages} href={listHref} />
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-center" role="status">
          {search ? (
            <>
              <p>
                {t.rich('products.noMatch', { query: <Bidi>{search}</Bidi> })}
              </p>
              <Link
                href="/products"
                className="text-primary mt-2 inline-block underline"
              >
                {t('products.viewAll')}
              </Link>
            </>
          ) : (
            <p>{t('products.none')}</p>
          )}
        </div>
      )}
    </div>
  );
}
