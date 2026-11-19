import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.int.spec.ts'],
    // Each test file boots Payload against its own throwaway database. Forks
    // give every file its own process, so environment variables and Payload's
    // instance cache never leak between files.
    pool: 'forks',
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
