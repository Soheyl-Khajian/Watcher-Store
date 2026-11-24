// frontend/src/components/ui/product-gallery.tsx

'use client';

import { useFormatter } from '@/i18n/client';
import type { Media } from '@payload-types';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { mediaSrc } from '@/lib/utils/media';

interface ProductGalleryProps {
  // determined by payload types
  gallery: {
    image: Media | number; // image can be whole object or an ID
    id?: string | null;
  }[];
  // Describes the images for screen readers when they have no alt text.
  productName: string;
}

export function ProductGallery({ gallery, productName }: ProductGalleryProps) {
  // set the first image in the gallery as active image
  const [selectedImage, setSelectedImage] = useState(gallery[0]?.image);
  const format = useFormatter();

  if (!gallery || gallery.length === 0 || !selectedImage) {
    return (
      <div className="bg-muted flex aspect-square w-full items-center justify-center rounded-lg">
        <p>تصویری وجود ندارد</p>
      </div>
    );
  }

  const images = gallery.filter(
    (item): item is { image: Media; id?: string | null } =>
      typeof item.image === 'object',
  );
  const selectedIndex = images.findIndex(
    (item) => item.image.id === (selectedImage as Media)?.id,
  );
  const altFor = (image: Media, index: number) =>
    image.alt ||
    (images.length > 1
      ? `${productName} - تصویر ${format.number(index + 1)}`
      : productName);

  const getImageUrl = (image: Media | number) => {
    if (typeof image === 'object' && image?.url) {
      return mediaSrc(image.url);
    }
    return '/images/placeholder.png';
  };

  return (
    <div className="flex flex-col gap-4">
      {/*main image*/}
      <div className="aspect-square w-full overflow-hidden rounded-lg border">
        <div className="relative h-full w-full">
          <Image
            src={getImageUrl(selectedImage)}
            alt={
              typeof selectedImage === 'object'
                ? altFor(selectedImage, Math.max(0, selectedIndex))
                : productName
            }
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
            // The page's main image: load it at once, not lazily.
            priority
          />
        </div>
      </div>

      {/*(Thumbnails)*/}
      {images.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {images.map((item, index) => {
            const imageUrl = getImageUrl(item.image);
            const isSelected = index === selectedIndex;

            return (
              <button
                key={item.id ?? item.image.id}
                type="button"
                aria-label={`نمایش تصویر ${format.number(index + 1)} از ${format.number(images.length)}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedImage(item.image)}
                className={cn(
                  'aspect-square w-full overflow-hidden rounded-md border transition-all',
                  isSelected
                    ? 'border-primary ring-primary ring-2'
                    : 'border-border',
                )}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 20vw, 10vw"
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
