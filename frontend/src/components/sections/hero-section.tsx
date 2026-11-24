// frontend/src/components/sections/hero-section.tsx

import { getT } from '@/i18n/server';
import { ProductSearchForm } from '@/components/search/product-search-form';

export async function HeroSection() {
  const t = await getT();
  return (
    <section className="py-20 text-center">
      <div className="px-2">
        {/* The home page's main heading. */}
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          {t('home.heroTitle')}
        </h1>

        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-xl">
          {t('home.heroText')}
        </p>

        <ProductSearchForm className="mx-auto mt-8 max-w-md" />
      </div>
    </section>
  );
}
