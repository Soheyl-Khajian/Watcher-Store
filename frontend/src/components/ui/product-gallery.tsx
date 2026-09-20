// frontend/src/components/ui/product-gallery.tsx

'use client';

import type { Media } from '@payload-types';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { resolvePayloadMediaUrl } from '@/lib/utils/media';


interface ProductGalleryProps {
  // determined by payload types
  gallery: {
    image: Media | number; // image can be whole object or an ID
    id?: string | null;
  }[];
}

export function ProductGallery({ gallery }: ProductGalleryProps) {
  // set the first image in the gallery as active image
  const [selectedImage, setSelectedImage] = useState(gallery[0]?.image);

  if (!gallery || gallery.length === 0 || !selectedImage) {
    return (
      <div className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center">
        <p>تصویری وجود ندارد</p>
      </div>
    );
  }

  const getImageUrl = (image: Media | number) => {
    if (typeof image === 'object' && image?.url) {
      return resolvePayloadMediaUrl(image.url);
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
            alt="تصویر محصول"
            fill
            unoptimized
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      {/*(Thumbnails)*/}
      <div className="grid grid-cols-5 gap-2">
        {gallery.map((item) => {
          // make sure every item has a valid image
          if (typeof item.image !== 'object') return null;

          const imageUrl = getImageUrl(item.image);

          return (
            <button
              key={item.id}
              onClick={() => setSelectedImage(item.image)}
              className={cn(
                'aspect-square w-full overflow-hidden rounded-md border transition-all',
                (selectedImage as Media)?.id === item.image.id
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-border',
              )}
            >
              <div className="relative h-full w-full">
                <Image
                  src={imageUrl}
                  alt="تصویر کوچک محصول"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
