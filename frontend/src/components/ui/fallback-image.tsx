// frontend/src/components/ui/fallback-image.tsx
//
// next/image that shows the placeholder picture instead of a broken image
// when the file is missing (deleted in the CMS, or the media store is
// down). A new src is tried again.

'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

export const PLACEHOLDER_IMAGE = '/images/placeholder.png';

export function FallbackImage({ src, alt, onError, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null);
  const broken = !src || failedSrc === src;

  return (
    <Image
      {...props}
      alt={alt}
      src={broken ? PLACEHOLDER_IMAGE : src}
      onError={(event) => {
        setFailedSrc(src);
        onError?.(event);
      }}
    />
  );
}
