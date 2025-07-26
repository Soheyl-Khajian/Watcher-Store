// مسیر فایل: src/components/ui/product-card.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';
import { useAuthStore } from '@/lib/store/auth';
import { addToCart } from '@/lib/api/nestjs';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL;
  const { token, setCart } = useAuthStore();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  const imageUrl = product.thumbnail?.url
    ? `${payloadUrl}${product.thumbnail.url}`
    : '/images/placeholder.png';

  const handleAddToCart = async () => {
    if (!token) {
      toast.error('برای افزودن محصول به سبد خرید، لطفاً ابتدا وارد شوید.');
      // در اینجا می‌توان کاربر را به صفحه ورود هدایت کرد
      // router.push('/login');
      return;
    }

    const updatedCart = await addToCart(product.id, 1, token);

    if (updatedCart) {
      setCart(updatedCart);
      toast.success(`${product.name} به سبد خرید اضافه شد.`);
    } else {
      toast.error('خطا در افزودن محصول به سبد خرید.');
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 pt-0 pb-1 px-0">
        <CardHeader className="p-0">
          <div className="relative h-36 sm:h-70 w-full">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-1 sm:px-4 sm:py-1">
          <CardTitle className="text-sm sm:text-lg font-semibold leading-tight">
            <h3>{product.name}</h3>
          </CardTitle>
        </CardContent>

        <CardFooter className="flex items-center justify-between px-1.5 pt-0 sm:px-4">
          <div className="text-lg sm:text-xl font-bold">
            {formatPrice(product.price)}
          </div>
          <Button
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              handleAddToCart();
            }}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">افزودن به سبد خرید</span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
