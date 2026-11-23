// e2e/capture/capture.config.ts -> README screenshots (see capture.spec.ts).

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_STOREFRONT_URL ?? 'http://localhost:3002',
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
  },
});
