// frontend/next.config.ts
import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const payloadUrl =
  process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000/api';

const payloadOrigin = new URL(payloadUrl);

const payloadProtocol: 'http' | 'https' =
  payloadOrigin.protocol === 'https:' ? 'https' : 'http';

// Fixed security headers for every response, build assets included. The
// Content-Security-Policy changes per request and is set in middleware.ts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Older browsers that do not know CSP frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Production builds only. Browsers ignore it over plain http, so a local
  // production stack on http://localhost is unaffected.
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Linting runs once for the whole workspace (pnpm lint, and in CI) with
  // the root eslint.config.mjs, so next build does not run it again.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The payment result page used to live at /payment/verify. Payments that
  // were already in flight still come back there; the query (orderId) is
  // kept.
  async redirects() {
    return [
      {
        source: '/payment/verify',
        destination: '/payment/result',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: payloadProtocol,
        hostname: payloadOrigin.hostname,
        port: payloadOrigin.port,
        pathname: '/api/media/**',
      },
    ],
  },
};

export default nextConfig;
