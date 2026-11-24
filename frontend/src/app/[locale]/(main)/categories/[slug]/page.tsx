// frontend/src/app/[locale]/(main)/categories/[slug]/page.tsx

import { getT } from '@/i18n/server';
import { Bidi } from '@/components/ui/bidi';
import { fetchProductsAndCategoryBySlug } from '@/lib/api/payload';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { notFound } from 'next/navigation';
import { Pager } from '@/components/ui/pager';
import type { Metadata } from 'next';
import { openGraphDefaults } from '@/lib/seo';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = Number((await searchParams)?.page) || 1;
  const { category } = await fetchProductsAndCategoryBySlug(slug, page).catch(
    () => ({ category: null }),
  );
  if (!category) {
    return {};
  }
  const path = `/categories/${encodeURIComponent(slug)}${page > 1 ? `?page=${page}` : ''}`;
  const t = await getT();
  const description = t.plain('category.metaDescription', {
    name: category.name,
    site: t('site.name'),
  });
  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...(await openGraphDefaults()),
      url: path,
      title: category.name,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const t = await getT();
  const awaitedParams = await params;
  const { slug } = awaitedParams;
  const awaitedSearchParams = await searchParams;
  const page = Number(awaitedSearchParams?.page) || 1;

  const { category, productsResult } = await fetchProductsAndCategoryBySlug(
    slug,
    page,
  );

  if (!category) {
    return notFound();
  }

  const products = productsResult?.docs || [];
  const totalPages = productsResult?.totalPages || 1;

  // The listing's address; the pager adds ?page=.
  const listHref = `/categories/${encodeURIComponent(slug)}`;

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">
        {t.rich('category.heading', { name: <Bidi>{category.name}</Bidi> })}
      </h1>

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
        <p className="text-muted-foreground text-center">
          {t('category.empty')}
        </p>
      )}
    </div>
  );
}
