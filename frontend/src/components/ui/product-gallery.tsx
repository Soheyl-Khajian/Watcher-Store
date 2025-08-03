// مسیر فایل: src/components/ui/product-gallery.tsx

'use client'; // این کامپوننت برای مدیریت کلیک‌ها باید Client Component باشد

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Media } from '@payload-types';

interface ProductGalleryProps {
  // تایپ گالری را بر اساس تایپ‌های Payload مشخص می‌کنیم
  gallery: {
    image: Media | number; // تصویر می‌تواند آبجکت کامل یا فقط ID باشد
    id?: string | null;
  }[];
}

export function ProductGallery({ gallery }: ProductGalleryProps) {
  // اولین تصویر گالری را به عنوان تصویر فعال اولیه انتخاب می‌کنیم
  const [selectedImage, setSelectedImage] = useState(gallery[0]?.image);

  // اگر گالری خالی بود یا تصویر انتخاب شده معتبر نبود، چیزی نمایش نده
  if (!gallery || gallery.length === 0 || !selectedImage) {
    return (
      <div className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center">
        <p>تصویری وجود ندارد</p>
      </div>
    );
  }

  const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || '';

  // اطمینان از اینکه آبجکت Media داریم
  const getImageUrl = (image: Media | number) => {
    if (typeof image === 'object' && image?.url) {
      return `${payloadUrl}${image.url}`;
    }
    return '/images/placeholder.png'; // تصویر جایگزین
  };

  return (
    <div className="flex flex-col gap-4">
      {/* تصویر اصلی و بزرگ */}
      <div className="aspect-square w-full overflow-hidden rounded-lg border">
        <div className="relative h-full w-full">
          <Image
            src={getImageUrl(selectedImage)}
            alt="تصویر محصول"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* لیست تصاویر کوچک (Thumbnails) */}
      <div className="grid grid-cols-5 gap-2">
        {gallery.map((item) => {
          // اطمینان از اینکه هر آیتم یک تصویر معتبر دارد
          if (typeof item.image !== 'object') return null;

          const imageUrl = getImageUrl(item.image);

          return (
            <button
              key={item.id}
              onClick={() => setSelectedImage(item.image)}
              className={cn(
                'aspect-square w-full overflow-hidden rounded-md border transition-all',
                // اگر تصویر انتخاب شده بود، یک حاشیه رنگی به آن بده
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
