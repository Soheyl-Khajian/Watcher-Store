// مسیر فایل: src/components/sections/featured-products.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/ui/product-card';

// ۱. نوع پراپ را از تایپ‌های مشترک وارد می‌کنیم
import type { Product } from '@/types';

// ۲. تعریف می‌کنیم که این کامپوننت یک پراپ به نام products دریافت می‌کند
interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="py-8">
      <div>
        <div className="mb-2 flex items-center">
          <h2 className="my-2 mr-4 ml-2 text-3xl font-bold">فروش ویژه</h2>
          <Link
            href="/products" // <-- لینک را به صفحه محصولات تغییر دادم
            className="text-primary flex items-center gap-2 text-sm font-semibold hover:underline"
          >
            مشاهده همه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        {/* ۳. داده‌های آزمایشی حذف شده و روی پراپ products حلقه می‌زنیم */}
        <div className="m-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {products?.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
