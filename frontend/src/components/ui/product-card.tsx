// مسیر فایل: src/components/ui/product-card.tsx

import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Product } from '@/types'; // ۱. تایپ Product را از types وارد می‌کنیم
import { AddToCartButtonCard } from '../cart/add-to-cart-button-card';

interface ProductCardProps {
  product: Product;
}

// تابع کمکی برای فرمت قیمت
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
};

export function ProductCard({ product }: ProductCardProps) {
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || '';

  // ۲. استفاده از گالری به جای thumbnail
  // اولین تصویر گالری را به عنوان تصویر اصلی کارت در نظر می‌گیریم
  const mainImage =
    typeof product.gallery?.[0]?.image === 'object'
      ? product.gallery[0].image
      : null;

  const imageUrl = mainImage?.url
    ? `${payloadUrl}${mainImage.url}`
    : '/images/placeholder.png';

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 pt-0 pb-1 px-0">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full">
            {' '}
            {/* نسبت تصویر ۱:۱ برای زیبایی */}
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-grow p-2 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
            <h3>{product.name}</h3>
          </CardTitle>
        </CardContent>

        <CardFooter className="flex items-center justify-between p-2 pt-0 sm:p-4">
          {/* ۳. منطق جدید برای نمایش قیمت */}
          <div className="flex flex-col items-start font-bold">
            {product.isOnSale &&
            typeof product.salePrice === 'number' &&
            product.salePrice > 0 ? (
              <>
                <span className="text-base sm:text-lg text-primary">
                  {formatPrice(product.salePrice)}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          {/* ۴. استفاده از کامپوننت دکمه جدید */}
          <AddToCartButtonCard
            productId={product.id}
            productName={product.name}
          />
        </CardFooter>
      </Card>
    </Link>
  );
}
