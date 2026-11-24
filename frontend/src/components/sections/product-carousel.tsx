// frontend/src/components/sections/product-carousel.tsx
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

  const arrowClass =
    'static size-10 translate-y-0 cursor-pointer disabled:opacity-30';

  return (
    <section className="py-12">
      <Carousel
        opts={{
          align: 'start',
          direction: 'rtl',
          // Loop only when there are enough products to scroll through.
          loop: products.length > 5,
        }}
        aria-label={title}
        className="container mx-auto px-4"
      >
        {/* The arrows sit in the header, so at no width do they cover the
            cards; on touch screens the cards also swipe. */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-3xl font-bold">{title}</h2>
          <div className="flex items-center gap-3">
            <Link
              href={viewAllLink}
              className="text-primary flex items-center gap-2 text-sm font-semibold hover:underline"
            >
              مشاهده همه
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
            <CarouselPrevious className={arrowClass} />
            <CarouselNext className={arrowClass} />
          </div>
        </div>

        <CarouselContent>
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            >
              <div className="h-full">
                <ProductCard product={product} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
