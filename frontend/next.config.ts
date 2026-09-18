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

  const nextConfig: NextConfig = {
    output: 'standalone',
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