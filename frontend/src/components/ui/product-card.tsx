// frontend/src/components/ui/product-card.tsx

'use client';

import { useFormatter } from '@/i18n/client';
import { Bidi } from '@/components/ui/bidi';
import type { Product } from '@/types';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { mediaSrc } from '@/lib/utils/media';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddToCartButtonCard } from '../cart/add-to-cart-button-card';
import { StockNote } from './stock-note';
import { stockOf } from '@/lib/stock';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const format = useFormatter();
  const formatPrice = format.number;
  const mainImage =
    typeof product.gallery?.[0]?.image === 'object'
      ? product.gallery[0].image
      : null;
  const imageUrl = mainImage?.url
    ? mediaSrc(mainImage.url)
    : '/images/placeholder.png';

  return (
    <div className="group h-full">
      {/* The title's link stretches over the whole card (after:inset-0),
          so the card is clickable while the add-to-cart button stays a
          separate control, not a button inside a link. */}
      <Card className="relative flex h-full flex-col gap-3 overflow-hidden pt-0 pb-1 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-[4/3] w-full">
            <Image
              src={imageUrl}
              // The title link names the card; the image adds nothing.
              alt=""
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          </div>
        </CardHeader>

        <CardContent className="my-0 flex flex-grow flex-col justify-center px-1 py-0">
          <CardTitle className="line-clamp-2 text-center text-sm leading-tight font-semibold sm:text-base md:text-lg">
            <h3>
              <Link
                href={`/products/${encodeURIComponent(product.slug ?? '')}`}
                className="after:focus-visible:ring-ring after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none after:focus-visible:ring-2"
              >
                <Bidi>{product.name}</Bidi>
              </Link>
            </h3>
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
                  <span className="text-xs"> {format.tomanUnit}</span>
                </span>
                <span className="text-muted-foreground text-base line-through sm:text-lg">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-primary text-base sm:text-lg md:text-xl lg:text-2xl">
                {formatPrice(product.price)}
                <span className="text-xs"> {format.tomanUnit}</span>
              </span>
            )}
          </div>
          <StockNote stock={stockOf(product)} className="text-xs" />
          {/* Above the stretched link, so it stays clickable. */}
          <div className="relative z-10 w-full">
            <AddToCartButtonCard
              productId={product.id}
              productName={product.name}
              inStock={stockOf(product) > 0}
            />
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
