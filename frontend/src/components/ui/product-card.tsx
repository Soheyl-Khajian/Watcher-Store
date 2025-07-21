// مسیر فایل: src/components/ui/product-card.tsx
'use client'; // <---  قدم اول: این کامپوننت را به یک کلاینت کامپوننت تبدیل کن

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

interface ProductCardProps {
  product: {
    slug: string;
    name: string;
    price: number;
    imageUrl: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
  };

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 pt-0 pb-1 px-0">
        <CardHeader className="p-0">
          <div className="relative h-36 sm:h-70 w-full">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-1 sm:px-4 sm:py-1">
          {/* قدم دوم: تگ h3 را داخل کامپوننت قرار بده */}
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
              console.log(`${product.name} به سبد خرید اضافه شد`);
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
