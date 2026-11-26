// frontend/src/app/share-image.png/route.tsx -> /share-image.png
//
// The picture shown when a page without its own image is shared (Open
// Graph and Twitter cards; lib/seo.ts SHARE_IMAGE). The shop's mark on the
// Signal theme's dark slate. No words, so it suits pages in every language.

import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0e14',
        backgroundImage:
          'radial-gradient(circle at 70% 20%, rgba(52,195,143,0.28), transparent 55%), radial-gradient(circle at 15% 85%, rgba(70,110,170,0.30), transparent 55%)',
      }}
    >
      <svg width="300" height="300" viewBox="0 0 64 64">
        <path
          d="M32 4 56 13v17c0 15-10 25-24 30C18 55 8 45 8 30V13z"
          fill="#34c38f"
        />
        <circle cx="32" cy="31" r="13" fill="#e8ecf3" />
        <circle cx="32" cy="31" r="7" fill="#0b0e14" />
        <circle cx="35.5" cy="27.5" r="2.25" fill="#e8ecf3" />
      </svg>
    </div>,
    { width: 1200, height: 630 },
  );
}
