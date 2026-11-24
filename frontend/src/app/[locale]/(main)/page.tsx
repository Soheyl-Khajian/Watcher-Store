// frontend/src/app/(main)/page.tsx
import { HeroSection } from '@/components/sections/hero-section';
import { CategoryGrid } from '@/components/sections/category-grid';
import { ArticlesSection } from '@/components/sections/articles-section';
import {
  fetchProducts,
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
  // Independent requests, made at the same time.
  const [allProducts, featuredProducts, posts, importantCategories] =
    await Promise.all([
      fetchProducts(),
      fetchFeaturedProducts(),
      fetchPosts() as Promise<Post[]>,
      fetchCategoriesBySlugs(importantCategorySlugs),
    ]);

  return (
    <>
      <HeroSection />

      {/* featured products page */}
      <ProductCarousel
        title="فروش ویژه"
        products={featuredProducts}
        viewAllLink="/products?onSale=true"
      />

      <CategoryGrid categories={importantCategories} />

      {/* all products page */}
      <ProductCarousel
        title="همه محصولات"
        products={allProducts}
        viewAllLink="/products"
      />

      <ArticlesSection posts={posts} />
    </>
  );
}
