// مسیر فایل: src/app/(main)/categories/[slug]/page.tsx

import { fetchProductsAndCategoryBySlug } from '@/lib/api/payload'; // ۱. استفاده از تابع جدید
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';
import { notFound } from 'next/navigation';

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;

  // ۲. فقط یک فراخوانی API برای دریافت همه چیز
  const { category, products } = await fetchProductsAndCategoryBySlug(slug);

  // اگر دسته‌بندی وجود نداشت، صفحه 404 نمایش داده می‌شود
  if (!category) {
    return notFound();
  }

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8">
        محصولات دسته‌بندی: {category.name}
      </h1>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          محصولی در این دسته‌بندی یا زیرمجموعه‌های آن یافت نشد.
        </p>
      )}
    </div>
  );
}
