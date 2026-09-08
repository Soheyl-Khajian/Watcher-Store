// frontend/next.config.ts
import type { NextConfig } from 'next';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3000/api';
const payloadHost = new URL(payloadUrl).host; // e.g. localhost:3000

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: payloadHost.split(':')[0],
        port: payloadHost.split(':')[1] || '3000',
        pathname: '/api/media/**',
      },
    ],
  },
};

export default nextConfig;