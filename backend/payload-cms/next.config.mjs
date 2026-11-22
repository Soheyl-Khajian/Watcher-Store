import { withPayload } from '@payloadcms/next/withPayload';

const dev = process.env.NODE_ENV === 'development';

// The admin panel's Content-Security-Policy. Payload's admin renders inline
// scripts without a nonce, so scripts are limited to this site rather than
// to a nonce; everything else is as strict as the storefront's: nothing
// from other sites, no plugins, and no other site may frame the admin.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // blob: for previews of images being uploaded.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Production builds only. Browsers ignore it over plain http.
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000' }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };

    return webpackConfig;
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
