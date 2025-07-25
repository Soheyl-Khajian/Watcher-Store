// src/app/(main)/products/[slug]/page.tsx

import { fetchProductBySlug } from '@/lib/api/payload';
import { notFound } from 'next/navigation';
import type { Product } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

// این تابع به نکست می‌گوید که چه صفحاتی را در زمان بیلد بسازد
// (فعلاً آن را خالی می‌گذاریم تا صفحات به صورت داینامیک ساخته شوند)
export async function generateStaticParams() {
  return [];
}

// کامپوننت اصلی صفحه
//next.js prop example that is passed to component = {params: {slug: "iphone-15"}}
export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  // اگر محصولی با این اسلاگ پیدا نشد، صفحه 404 نمایش داده می‌شود
  if (!product) {
    return notFound();
  }

  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL;
  const imageUrl = product.thumbnail?.url
    ? `${payloadUrl}${product.thumbnail.url}`
    : '/images/placeholder.png';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <div className="grid md:grid-cols-2 gap-8">
        {/* بخش تصویر محصول */}
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain rounded-lg"
          />
        </div>

        {/* بخش اطلاعات و دکمه خرید */}
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {product.name}
          </h1>
          <p className="text-2xl text-primary font-semibold mb-6">
            {formatPrice(product.price)}
          </p>

          {/* در اینجا می‌توانید توضیحات کوتاه محصول را نمایش دهید */}
          {/* <p className="text-muted-foreground mb-6">{product.shortDescription}</p> */}

          <div className="flex items-center gap-4">
            <Button size="lg" className="flex-grow">
              <ShoppingCart className="ml-2 h-5 w-5" />
              افزودن به سبد خرید
            </Button>
          </div>
        </div>
      </div>

      {/* در اینجا می‌توانید توضیحات کامل محصول (richText) را نمایش دهید */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">نقد و بررسی</h2>
        {/* <div className="prose max-w-none">{product.description}</div> */}
      </div>
    </div>
  );
}
