import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/media/**', // اجازه دسترسی به تمام فایل‌های داخل این مسیر
      },
    ],
  },
};

export default nextConfig;
