// e2e/tests/site.spec.ts -> pages and protections every deployment needs.

import { expect, test } from '@playwright/test';
import { CMS_URL } from './env';

test('an unknown page answers 404 with the shop’s own page', async ({
  page,
}) => {
  const response = await page.goto('/this/page/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'صفحه مورد نظر پیدا نشد',
  );
});

test('the storefront sends its security headers', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response!.headers();

  const csp = headers['content-security-policy'];
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain('unsafe-eval');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['x-powered-by']).toBeUndefined();

  // Every script on the page carries this response's nonce: nothing was
  // blocked.
  const nonce = /'nonce-([^']+)'/.exec(csp)![1];
  const missing = await page.evaluate(
    (n) =>
      [...document.querySelectorAll('script')].filter(
        (s) => s.type !== 'application/ld+json' && s.nonce !== n,
      ).length,
    nonce,
  );
  expect(missing).toBe(0);
});

test('account pages send visitors to the login page', async ({ page }) => {
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/fa\/login\?next=%2Fprofile$/);
});

test('the admin panel sends its security headers', async ({ request }) => {
  const response = await request.get(`${CMS_URL}/admin/login`);
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('the image credits page lists the demo photos’ licenses', async ({
  page,
}) => {
  await page.goto('/image-credits');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'اعتبار تصاویر',
  );
  await expect(
    page.getByRole('link', { name: /CC BY|CC0|Public domain/ }).first(),
  ).toBeVisible();
});
