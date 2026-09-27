// frontend/src/components/ui/product-card.tsx

import type { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { resolvePayloadMediaUrl } from '@/lib/utils/media';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddToCartButtonCard } from '../cart/add-to-cart-button-card';

interface ProductCardProps {
  product: Product;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fa-IR').format(price);
};

export function ProductCard({ product }: ProductCardProps) {
  const mainImage =
    typeof product.gallery?.[0]?.image === 'object'
      ? product.gallery[0].image
      : null;
  const imageUrl = mainImage?.url
    ? resolvePayloadMediaUrl(mainImage.url)
    : '/images/placeholder.png';

  return (
    <div className="h-full">
      <Link href={`/products/${product.slug}`} className="group block h-full">
        <Card className="flex h-full cursor-default flex-col gap-3 overflow-hidden pt-0 pb-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader className="p-0">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                unoptimized
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            </div>
          </CardHeader>

          <CardContent className="my-0 flex flex-grow flex-col justify-center px-1 py-0">
            <CardTitle className="line-clamp-2 text-center text-sm leading-tight font-semibold sm:text-base md:text-lg">
              <h3>{product.name}</h3>
            </CardTitle>
          </CardContent>

          <CardFooter className="flex flex-col gap-1 px-2 py-1 pt-0">
            <div className="flex flex-col items-center font-bold">
              {product.isOnSale &&
              typeof product.salePrice === 'number' &&
              product.salePrice > 0 ? (
                <>
                  <span className="text-primary text-base sm:text-lg md:text-xl lg:text-2xl">
                    {formatPrice(product.salePrice)}
                    <span className="text-xs"> تومان</span>
                  </span>
                  <span className="text-muted-foreground text-base line-through sm:text-lg">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-primary text-base sm:text-lg md:text-xl lg:text-2xl">
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
