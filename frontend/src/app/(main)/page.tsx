// مسیر فایل: src/app/(main)/page.tsx

import { HeroSection } from '@/components/sections/hero-section';
import { ProductCard } from '@/components/ui/product-card';
import { CategoryGrid } from '@/components/sections/category-grid';
import { FeaturedProducts } from '@/components/sections/featured-products';
import { ArticlesSection } from '@/components/sections/articles-section';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// داده‌های آزمایشی برای یک محصول
const sampleProduct = {
  slug: 'camera-model-xyz',
  name: 'دوربین امنیتی هوشمند مدل A5 Pro 4K',
  price: 2500000,
  imageUrl: '/images/sample-product.png', // یک عکس آزمایشی در پوشه public/images قرار بده
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturedProducts />
      <CategoryGrid />

      {/* بخش آزمایشی برای نمایش کارت محصول */}
      <section className=" py-12">
        <div className="flex items-center mb-2">
          <h2 className="mr-4 ml-1 my-2 text-3xl font-bold">همه محصولات</h2>
          <Link
            href="/blog"
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 m-2 sm:grid-cols-3 lg:grid-cols-4 ">
          <ProductCard product={sampleProduct} />
          <ProductCard product={sampleProduct} />
          <ProductCard product={sampleProduct} />
          <ProductCard product={sampleProduct} />
        </div>
      </section>
      <ArticlesSection />
    </>
  );
}
