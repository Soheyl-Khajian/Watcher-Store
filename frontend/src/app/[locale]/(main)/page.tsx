// frontend/src/app/[locale]/(main)/page.tsx
import type { Metadata } from 'next';
import { toCardProduct } from '@/lib/product-card';
import { alternatesFor } from '@/lib/seo';
import { getT } from '@/i18n/server';
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

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: await alternatesFor('/') };
}

export default async function HomePage() {
  const t = await getT();
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
        title={t('nav.specials')}
        products={featuredProducts.map(toCardProduct)}
        viewAllLink="/products?onSale=true"
      />

      <CategoryGrid categories={importantCategories} />

      {/* all products page */}
      <ProductCarousel
        title={t('nav.allProducts')}
        products={allProducts.map(toCardProduct)}
        viewAllLink="/products"
      />

      <ArticlesSection posts={posts} />
    </>
  );
}
