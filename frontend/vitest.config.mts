import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // src/lib/env.ts validates these when it is first imported.
    env: {
      NEXT_PUBLIC_PAYLOAD_URL: 'https://cms.example.test/api',
      NEXT_PUBLIC_NESTJS_API_URL: 'https://api.example.test',
      NEXT_PUBLIC_FRONTEND_URL: 'https://shop.example.test',
    },
  },
});
