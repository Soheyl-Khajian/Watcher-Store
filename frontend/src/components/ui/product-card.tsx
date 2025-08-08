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
import type { Product } from '@/types';
import { AddToCartButtonCard } from '../cart/add-to-cart-button-card';

interface ProductCardProps {
  product: Product;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fa-IR').format(price);
};

export function ProductCard({ product }: ProductCardProps) {
  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || '';
  const mainImage =
    typeof product.gallery?.[0]?.image === 'object'
      ? product.gallery[0].image
      : null;
  const imageUrl = mainImage?.url
    ? `${payloadUrl}${mainImage.url}`
    : '/images/placeholder.png';

  return (
    <div className="h-full">
      <Link href={`/products/${product.slug}`} className="group block h-full">
        {/* ۱. بازگشت به ساختار Flexbox که قابل اطمینان‌تر است */}
        <Card className="flex h-full flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 pt-0 pb-1 gap-3 cursor-default">
          {/* بخش تصویر */}
          <CardHeader className="p-0">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </div>
          </CardHeader>

          {/* ۲. محتوای کارت با flex-grow برای هم‌اندازه کردن کارت‌ها */}
          <CardContent className="flex-grow px-1 py-0 my-0 flex flex-col justify-center">
            <CardTitle className="text-center text-sm sm:text-base md:text-lg font-semibold leading-tight line-clamp-2">
              <h3>{product.name}</h3>
            </CardTitle>
          </CardContent>

          {/* ۳. فوتر با padding و gap مشخص */}
          <CardFooter className="flex flex-col gap-1 px-2 py-1 pt-0">
            <div className="flex flex-col items-center font-bold">
              {product.isOnSale &&
              typeof product.salePrice === 'number' &&
              product.salePrice > 0 ? (
                <>
                  <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-primary">
                    {formatPrice(product.salePrice)}
                    <span className="text-xs"> تومان</span>
                  </span>
                  <span className="text-base sm:text-lg text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-primary">
                  {formatPrice(product.price)}
                  <span className="text-xs"> تومان</span>
                </span>
              )}
            </div>
            <AddToCartButtonCard
              productId={product.id}
              productName={product.name}
            />
          </CardFooter>
        </Card>
      </Link>
    </div>
  );
}
