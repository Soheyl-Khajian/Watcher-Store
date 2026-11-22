// frontend/src/app/apple-icon.tsx -> the home-screen icon on iOS (PNG),
// drawn from the same mark as app/icon.svg.

import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1c1917',
      }}
    >
      <svg width="140" height="140" viewBox="0 0 64 64">
        <path
          d="M32 4 56 13v17c0 15-10 25-24 30C18 55 8 45 8 30V13z"
          fill="#ff6900"
        />
        <circle cx="32" cy="31" r="13" fill="#fff" />
        <circle cx="32" cy="31" r="7" fill="#1c1917" />
        <circle cx="35.5" cy="27.5" r="2.25" fill="#fff" />
      </svg>
    </div>,
    size,
  );
}
