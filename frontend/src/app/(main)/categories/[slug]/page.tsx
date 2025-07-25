// src/app/(main)/categories/[slug]/page.tsx

import {
  fetchCategoryBySlug,
  fetchProductsByCategoryId,
} from '@/lib/api/payload';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { notFound } from 'next/navigation';

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;

  // مرحله ۱: اطلاعات دسته‌بندی را بر اساس اسلاگ پیدا می‌کنیم
  const category = await fetchCategoryBySlug(slug);

  // اگر دسته‌بندی وجود نداشت، صفحه 404 نمایش داده می‌شود
  if (!category) {
    return notFound();
  }

  // مرحله ۲: از ID دسته‌بندی برای دریافت محصولات مربوطه استفاده می‌کنیم
  const products = await fetchProductsByCategoryId(category.id);

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        محصولات دسته‌بندی: {category.name}
      </h1>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          محصولی در این دسته‌بندی یافت نشد.
        </p>
      )}
    </div>
  );
}
