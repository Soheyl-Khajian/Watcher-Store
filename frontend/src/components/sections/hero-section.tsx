// مسیر فایل: src/components/sections/hero-section.tsx

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export function HeroSection() {
  return (
    // از تگ <section> برای جداسازی معنایی بخش ها استفاده می کنیم
    <section className="py-20 text-center">
      <div className="px-2">
        {/* ۱. مهم‌ترین تگ سئو در صفحه اصلی */}
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          امنیت هوشمند، آسایش پایدار
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-xl text-muted-foreground">
          بهترین تجهیزات امنیتی و هوشمندسازی ساختمان را با مشاوره تخصصی و ضمانت
          اصالت از واچر بخواهید.
        </p>

        {/* ۲. نوار جستجو */}
        <div className="relative mx-auto mt-8 max-w-md">
          <Input
            type="search"
            placeholder="دنبال چه محصولی می‌گردی؟"
            className="h-12 rounded-full pl-10 pr-4 text-base"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </section>
  );
}
