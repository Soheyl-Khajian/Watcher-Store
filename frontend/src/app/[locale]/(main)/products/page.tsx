// مسیر فایل: src/app/(main)/products/page.tsx
import { isolate } from '@/lib/bidi';
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
  if (normalizeSearchQuery(awaited?.q)) {
    return { title: 'جستجوی محصولات', robots: { index: false } };
  }
  return awaited?.onSale === 'true'
    ? { title: 'فروش ویژه', alternates: { canonical: '/products?onSale=true' } }
    : { title: 'همه محصولات', alternates: { canonical: '/products' } };
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
  const pageTitle = search
    ? `نتایج جستجو برای «${isolate(search)}»`
    : onSale
      ? 'محصولات در فروش ویژه'
      : 'همه محصولات';

  // تابعی برای ساخت لینک‌های صفحه‌بندی با حفظ فیلتر
  const createPageUrl = (p: number) => {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (onSale) {
      params.set('onSale', 'true');
    }
    if (search) {
      params.set('q', search);
    }
    return `/products?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold">{pageTitle}</h1>
          {search && products.length > 0 ? (
            <p className="text-muted-foreground mt-2" role="status">
              {totalDocs.toLocaleString('fa-IR')} محصول پیدا شد
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
            <Pager
              page={page}
              totalPages={totalPages}
              hrefFor={createPageUrl}
            />
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-center" role="status">
          {search ? (
            <>
              <p>
                محصولی با عبارت «<Bidi>{search}</Bidi>» پیدا نشد.
              </p>
              <Link
                href="/products"
                className="text-primary mt-2 inline-block underline"
              >
                مشاهده همه محصولات
              </Link>
            </>
          ) : (
            <p>محصولی برای نمایش یافت نشد.</p>
          )}
        </div>
      )}
    </div>
  );
}
