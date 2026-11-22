// مسیر فایل: src/components/sections/hero-section.tsx

import { ProductSearchForm } from '@/components/search/product-search-form';

export function HeroSection() {
  return (
    // از تگ <section> برای جداسازی معنایی بخش ها استفاده می کنیم
    <section className="py-20 text-center">
      <div className="px-2">
        {/* ۱. مهم‌ترین تگ سئو در صفحه اصلی */}
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          امنیت هوشمند، آسایش پایدار
        </h1>

        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-xl">
          بهترین تجهیزات امنیتی و هوشمندسازی ساختمان را با مشاوره تخصصی و ضمانت
          اصالت از واچر بخواهید.
        </p>

        <ProductSearchForm className="mx-auto mt-8 max-w-md" />
      </div>
    </section>
  );
}
