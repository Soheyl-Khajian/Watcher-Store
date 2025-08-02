// مسیر فایل: src/app/(main)/page.tsx

import { HeroSection } from '@/components/sections/hero-section';
import { ProductCard } from '@/components/ui/product-card';
import { CategoryGrid } from '@/components/sections/category-grid';
import { FeaturedProducts } from '@/components/sections/featured-products';
import { ArticlesSection } from '@/components/sections/articles-section';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  fetchProducts,
  fetchParentCategories,
  fetchPosts,
} from '@/lib/api/payload';
import type { Product } from '@/types';

export default async function HomePage() {
  const products = await fetchProducts();
  const parentCategories = await fetchParentCategories();
  const posts = await fetchPosts();

  return (
    <>
      <HeroSection />
      <FeaturedProducts products={products} />
      <CategoryGrid categories={parentCategories} />

      <section className="py-12">
        <div className="flex items-center mb-2">
          <h2 className="mr-4 ml-1 my-2 text-3xl font-bold">همه محصولات</h2>
          <Link
            href="/products" // لینک به صفحه آرشیو محصولات
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 m-2 sm:grid-cols-3 lg:grid-cols-4 ">
          {/* ۵. به جای تکرار داده‌های تستی، روی داده‌های واقعی حلقه می‌زنیم */}
          {products?.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
      <ArticlesSection posts={posts} />
    </>
  );
}
