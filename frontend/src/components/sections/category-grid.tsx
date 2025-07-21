// مسیر فایل: src/components/sections/category-grid.tsx

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

const categories = [
  {
    name: 'دوربین‌های مداربسته',
    href: '/category/cctv',
    imageUrl: '/images/cat-cctv.png',
  },
  {
    name: 'خانه هوشمند',
    href: '/category/smart-home',
    imageUrl: '/images/cat-smart-home.png',
  },
  {
    name: 'پنل‌های خورشیدی',
    href: '/category/solar',
    imageUrl: '/images/cat-solar.png',
  },
  {
    name: 'کنترل تردد و کرکره',
    href: '/category/access-control',
    imageUrl: '/images/cat-access.png',
  },
];

export function CategoryGrid() {
  return (
    <section className="bg-muted/40 py-12">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-3xl font-bold">
          خرید بر اساس دسته‌بندی
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              href={category.href}
              key={category.name}
              className="group block"
            >
              <Card className="overflow-hidden p-0">
                <div className="relative h-64 w-full">
                  <Image
                    src={category.imageUrl}
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
          ))}
        </div>
      </div>
    </section>
  );
}
