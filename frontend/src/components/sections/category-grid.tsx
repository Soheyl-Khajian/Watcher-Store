// src/components/sections/category-grid.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import type { Category } from '@/types';

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL;
  return (
    <section className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">
          خرید بر اساس دسته‌بندی
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories?.map((category) => {
            // ۱. ابتدا آدرس تصویر را به صورت امن می‌سازیم
            const imageUrl = category.image?.url
              ? `${payloadUrl}${category.image.url}`
              : '/images/placeholder.png';

            return (
              <Link
                href={`/categories/${category.slug}`}
                key={category.id}
                className="group block"
              >
                <Card className="overflow-hidden p-0">
                  <div className="relative h-64 w-full">
                    <Image
                      src={imageUrl} // ۲. از آدرس ساخته شده استفاده می‌کنیم
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <h3 className="text-2xl font-bold text-white">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
