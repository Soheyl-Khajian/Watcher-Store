// src/app/(main)/products/[slug]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation'; // ۱. useParams را وارد کنید
import type { Product } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { fetchProductBySlug } from '@/lib/api/payload';
import { useAuthStore } from '@/lib/store/auth';
import { addToCart } from '@/lib/api/nestjs';
import { toast } from 'sonner';

// ۲. پراپ params را از تعریف کامپوننت حذف کنید
export default function ProductPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const { token, setCart } = useAuthStore();
  const params = useParams(); // ۳. از هوک useParams برای دریافت پارامترها استفاده کنید
  const slug = params.slug as string; // اسلاگ را از آن استخراج کنید

  useEffect(() => {
    const getProduct = async () => {
      if (slug) {
        // ۴. مطمئن شوید که اسلاگ وجود دارد
        const fetchedProduct = await fetchProductBySlug(slug);
        if (!fetchedProduct) {
          notFound();
        } else {
          setProduct(fetchedProduct);
        }
      }
    };
    getProduct();
  }, [slug]); // ۵. هوک را به اسلاگ وابسته کنید

  const handleAddToCart = async () => {
    if (!token) {
      toast.error('برای افزودن محصول به سبد خرید، لطفاً ابتدا وارد شوید.');
      return;
    }
    if (!product) return;

    const updatedCart = await addToCart(product.id, 1, token);

    if (updatedCart) {
      setCart(updatedCart);
      toast.success(`${product.name} به سبد خرید اضافه شد.`);
    } else {
      toast.error('خطا در افزودن محصول به سبد خرید.');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  if (!product) {
    return <div>در حال بارگذاری...</div>;
  }

  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL;
  const imageUrl = product.thumbnail?.url
    ? `${payloadUrl}${product.thumbnail.url}`
    : '/images/placeholder.png';

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain rounded-lg"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {product.name}
          </h1>
          <p className="text-2xl text-primary font-semibold mb-6">
            {formatPrice(product.price)}
          </p>
          <div className="flex items-center gap-4">
            <Button size="lg" className="flex-grow" onClick={handleAddToCart}>
              <ShoppingCart className="ml-2 h-5 w-5" />
              افزودن به سبد خرید
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
