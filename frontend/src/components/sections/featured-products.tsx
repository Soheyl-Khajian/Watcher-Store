// مسیر فایل: src/components/sections/featured-products.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { ProductCard } from '@/components/ui/product-card';

// داده‌های آزمایشی برای محصولات
const sampleProducts = [
  {
    slug: 'camera-a5-pro',
    name: 'دوربین امنیتی هوشمند مدل A5 Pro 4K',
    price: 2500000,
    imageUrl: '/images/sample-product-1.png',
  },
  {
    slug: 'smart-lock-g2',
    name: 'قفل هوشمند اثر انگشتی مدل G2',
    price: 3200000,
    imageUrl: '/images/sample-product-2.png',
  },
  {
    slug: 'solar-panel-s500',
    name: 'پنل خورشیدی 500 وات مونوکریستال',
    price: 8900000,
    imageUrl: '/images/sample-product-3.png',
  },
  {
    slug: 'alarm-kit-z1',
    name: 'کیت کامل دزدگیر اماکن هوشمند Z1',
    price: 4500000,
    imageUrl: '/images/sample-product-4.png',
  },
];

export function FeaturedProducts() {
  return (
    <section className="py-8">
      <div className="">
        {/* ۱. عنوان بخش در تگ H2 برای سئو */}
        <div className="flex items-center mb-2">
          <h2 className="mr-4 ml-2 my-2 text-3xl font-bold">فروش ویژه</h2>
          <Link
            href="/blog"
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* ۲. گرید واکنش‌گرا برای نمایش محصولات */}
        <div className="grid grid-cols-2 gap-2 m-2 sm:grid-cols-3 lg:grid-cols-4">
          {sampleProducts.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
