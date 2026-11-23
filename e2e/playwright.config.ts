// e2e/playwright.config.ts
//
// End-to-end tests against the production stack with the mock gateway
// (e2e/docker-compose.e2e.yml), filled with the demo data (seed:demo).
// See e2e/README.md.

import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // One worker: the tests share the stack, and Nest's login rate limit
  // counts all storefront logins together when no proxy is in front.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_STOREFRONT_URL ?? 'http://localhost:3002',
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    trace: CI ? 'on-first-retry' : 'retain-on-failure',
    video: CI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // An installed browser instead of Playwright's own download, e.g.
        // E2E_BROWSER_CHANNEL=msedge. CI uses Playwright's Chromium.
        channel: process.env.E2E_BROWSER_CHANNEL || undefined,
      },
    },
  ],
});
