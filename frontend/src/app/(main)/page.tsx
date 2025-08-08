// مسیر فایل: src/app/(main)/page.tsx
import { HeroSection } from '@/components/sections/hero-section';
import { CategoryGrid } from '@/components/sections/category-grid';
import { ArticlesSection } from '@/components/sections/articles-section';
import {
  fetchProducts,
  fetchParentCategories,
  fetchPosts,
  fetchFeaturedProducts,
} from '@/lib/api/payload';
import { ProductCarousel } from '@/components/sections/product-carousel';
import { Post } from '@/types';

export default async function HomePage() {
  const allProducts = await fetchProducts(); // حالا ۱۲ محصول برمی‌گرداند
  const featuredProducts = await fetchFeaturedProducts(); // فقط محصولات فروش ویژه را می‌گیرد
  const parentCategories = await fetchParentCategories();
  const posts: Post[] = (await fetchPosts()) || [];

  return (
    <>
      <HeroSection />

      {/* صفحه محصولات ویژه */}
      <ProductCarousel
        title="فروش ویژه"
        products={featuredProducts}
        viewAllLink="/products?onSale=true"
      />

      <CategoryGrid categories={parentCategories} />

      {/* صفحه همه محصولات */}
      <ProductCarousel
        title="همه محصولات"
        products={allProducts}
        viewAllLink="/products"
      />

      <ArticlesSection posts={posts} />
    </>
  );
}
