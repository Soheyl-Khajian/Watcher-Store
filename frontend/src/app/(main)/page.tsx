// مسیر فایل: src/app/(main)/page.tsx
import { HeroSection } from '@/components/sections/hero-section';
import { CategoryGrid } from '@/components/sections/category-grid';
import { ArticlesSection } from '@/components/sections/articles-section';
import {
  fetchProducts,
  fetchParentCategories,
  fetchCategoriesBySlugs,
  fetchPosts,
  fetchFeaturedProducts,
} from '@/lib/api/payload';
import { ProductCarousel } from '@/components/sections/product-carousel';
import { Post } from '@/types';

const importantCategorySlugs = [
  'cctv-cameras',
  'automatic-doors',
  'solar-panels',
  'emergency-power',
  'smart-lighting',
  'alarm-systems',
];

export default async function HomePage() {
  const allProducts = await fetchProducts(); // حالا ۱۲ محصول برمی‌گرداند
  const featuredProducts = await fetchFeaturedProducts(); // فقط محصولات فروش ویژه را می‌گیرد
  const parentCategories = await fetchParentCategories();
  const posts: Post[] = (await fetchPosts()) || [];

  const importantCategories = await fetchCategoriesBySlugs(
    importantCategorySlugs,
  );

  return (
    <>
      <HeroSection />

      {/* صفحه محصولات ویژه */}
      <ProductCarousel
        title="فروش ویژه"
        products={featuredProducts}
        viewAllLink="/products?onSale=true"
      />

      <CategoryGrid categories={importantCategories} />

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
