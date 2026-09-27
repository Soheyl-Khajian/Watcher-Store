// src/app/(main)/categories/[slug]/page.tsx

import { fetchProductsAndCategoryBySlug } from '@/lib/api/payload';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { notFound } from 'next/navigation';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// تابع کمکی برای تبدیل اعداد به فارسی
const toPersianDigits = (num: number) => {
  return new Number(num).toLocaleString('fa-IR', { useGrouping: false });
};

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
  const createPageUrl = (p: number) => `/categories/${slug}?page=${p}`;

  return (
    <div className="container mx-auto py-12">
      <h1 className="mb-8 text-3xl font-bold md:text-4xl">
        محصولات دسته‌بندی: {category.name}
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
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={page > 1 ? createPageUrl(page - 1) : '#'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {toPersianDigits(page)}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href={page < totalPages ? createPageUrl(page + 1) : '#'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
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
