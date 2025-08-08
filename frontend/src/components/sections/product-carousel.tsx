// مسیر فایل: src/components/sections/product-carousel.tsx
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ProductCard } from '@/components/ui/product-card';
import type { Product } from '@/types';

interface ProductCarouselProps {
  title: string;
  products: Product[];
  viewAllLink: string;
}

export function ProductCarousel({
  title,
  products,
  viewAllLink,
}: ProductCarouselProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">{title}</h2>
          <Link
            href={viewAllLink}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <Carousel
            opts={{
              align: 'start',
              direction: 'rtl',
              // اگر تعداد محصولات برای اسکرول کافی نبود، چرخش بی‌نهایت را غیرفعال می‌کنیم
              loop: products.length > 5,
            }}
            className="w-full"
          >
            {/* ۱. استفاده از مارجین منفی استاندارد shadcn/ui */}
            <CarouselContent className="-mr-2 md:-mr-4">
              {products.map((product) => (
                // ۲. تعریف اندازه پایه برای موبایل (basis-1/2) و پدینگ متناسب
                <CarouselItem
                  key={product.id}
                  className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 pr-4"
                >
                  <div className="h-full">
                    <ProductCard product={product} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="absolute -left-3 md:-left-4 lg:-left-6 top-1/2 -translate-y-1/2 h-12 w-12 border-2 bg-background/50 backdrop-blur z-10 disabled:opacity-30 cursor-pointer" />
            <CarouselNext className="absolute -right-3 md:-right-4 lg:-right-6 top-1/2 -translate-y-1/2 h-12 w-12 border-2 bg-background/50 backdrop-blur z-10 disabled:opacity-30 cursor-pointer" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
