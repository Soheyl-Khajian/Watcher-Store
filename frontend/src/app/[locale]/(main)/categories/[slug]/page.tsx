// src/app/(main)/categories/[slug]/page.tsx

import { Bidi } from '@/components/ui/bidi';
import { fetchProductsAndCategoryBySlug } from '@/lib/api/payload';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { notFound } from 'next/navigation';
import { Pager } from '@/components/ui/pager';
import type { Metadata } from 'next';
import { SITE_NAME, OPEN_GRAPH_DEFAULTS } from '@/lib/seo';

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
  const description = `خرید محصولات ${category.name} از ${SITE_NAME}`;
  return {
    title: category.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
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
  const awaitedParams = await params;
  const { slug } = awaitedParams;
  const awaitedSearchParams = await searchParams;
  const page = Number(awaitedSearchParams?.page) || 1;

  // ۱. شماره صفحه به تابع fetch پاس داده می‌شود
  const { category, productsResult } = await fetchProductsAndCategoryBySlug(
    slug,
    page,
  );

  if (!category) {
    return notFound();
  }

  const products = productsResult?.docs || [];
  const totalPages = productsResult?.totalPages || 1;

  // ۲. تابع کمکی برای ساخت URL های صفحه‌بندی
  const listHref = `/categories/${encodeURIComponent(slug)}`;

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">
        محصولات دسته‌بندی: <Bidi>{category.name}</Bidi>
      </h1>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* ۳. اضافه شدن کامپوننت Pagination */}
          <div className="mt-12">
            <Pager page={page} totalPages={totalPages} href={listHref} />
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-center">
          محصولی در این دسته‌بندی یا زیرمجموعه‌های آن یافت نشد.
        </p>
      )}
    </div>
  );
}
