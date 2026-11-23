// e2e/capture/capture.spec.ts
//
// Not a test: walks through the demo store and saves the screenshots used in
// the README (assets/). Run against a seeded stack, like the tests:
//   CAPTURE_DIR=<folder> E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... \
//     pnpm --filter e2e exec playwright test --config capture/capture.config.ts
// then build the images with capture/build-assets.mjs.

import { test, type Page } from '@playwright/test';
import { join } from 'node:path';
import {
  adminAccount,
  CMS_URL,
  GATEWAY_FROM_TESTS,
  GATEWAY_IN_STACK,
  persianDigits,
} from '../tests/env';

const OUT = process.env.CAPTURE_DIR ?? 'capture-output';
let frame = 0;

async function shot(page: Page, name: string, fullPage = false) {
  // Let images and fonts settle.
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  frame += 1;
  await page.screenshot({
    path: join(OUT, `${String(frame).padStart(2, '0')}-${name}.png`),
    fullPage,
  });
}

test('capture the demo store', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await page.route(`${GATEWAY_IN_STACK}/**`, (route) =>
    route.continue({
      url: route.request().url().replace(GATEWAY_IN_STACK, GATEWAY_FROM_TESTS),
    }),
  );

  // Visitor: home, a category, a product.
  await page.goto('/');
  await shot(page, 'home');
  await page.mouse.wheel(0, 900);
  await shot(page, 'home-catalog');
  await page.goto('/categories/cctv-cameras');
  await shot(page, 'category');
  await page.goto('/products/ptz-speed-dome-25x');
  await shot(page, 'product');

  // Customer: register, search, cart, checkout, pay.
  const email = `capture-${Date.now()}@example.test`;
  const password = `capture-${Math.random().toString(36).slice(2)}-Pw`;
  await page.goto('/register');
  await page.getByLabel('ایمیل').fill(email);
  await page.getByLabel('رمز عبور', { exact: true }).fill(password);
  await page.getByLabel('تکرار رمز عبور').fill(password);
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();
  await page.waitForURL(/\/$/);

  await page.getByLabel('جستجوی محصول').fill('خورشیدی');
  await page.getByRole('button', { name: 'جستجو', exact: true }).click();
  await page.waitForURL(/\/products\?q=/);
  await shot(page, 'search');

  await page
    .getByRole('link', { name: 'پنل خورشیدی مونوکریستال ۴۵۰ وات' })
    .first()
    .click();
  await page.waitForURL(/\/products\/mono-solar-panel-450w$/);
  await page.getByRole('button', { name: 'افزودن به سبد خرید' }).click();
  await page.getByRole('button', { name: /باز کردن سبد خرید، ۱ کالا/ }).click();
  await page
    .getByRole('button', {
      name: 'یکی بیشتر از پنل خورشیدی مونوکریستال ۴۵۰ وات',
    })
    .click();
  await page.getByRole('dialog').getByText('۲', { exact: true }).waitFor();
  await shot(page, 'cart');

  await page.getByRole('link', { name: 'ادامه و تسویه حساب' }).click();
  await page.getByLabel('نام و نام خانوادگی گیرنده').fill('مریم احمدی');
  await page.getByLabel('شماره موبایل').fill('09121234567');
  await page.getByLabel('استان').fill('تهران');
  await page.getByLabel('شهر').fill('تهران');
  await page
    .getByLabel('نشانی کامل')
    .fill('خیابان ولیعصر، کوچه نمونه، پلاک ۱۲');
  await page.getByLabel('کد پستی').fill('1234567890');
  await shot(page, 'checkout');

  await page.getByRole('button', { name: 'ثبت سفارش و پرداخت' }).click();
  await page.waitForURL(/\/payment\/result\?orderId=\d+/, { timeout: 30_000 });
  const orderId = Number(new URL(page.url()).searchParams.get('orderId'));
  await page.getByRole('heading', { name: 'پرداخت موفق' }).waitFor();
  await shot(page, 'payment-result');

  await page.goto('/profile');
  await page
    .getByRole('heading', { name: `سفارش #${persianDigits(orderId)}` })
    .waitFor();
  await shot(page, 'profile');

  // Administrator: the Orders view, then ship the order.
  const admin = adminAccount();
  const adminContext = await browser.newContext({
    locale: 'fa-IR',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
  });
  const adminPage = await adminContext.newPage();
  await adminPage.goto(`${CMS_URL}/admin/login`);
  await adminPage.locator('input[name="email"]').fill(admin.email);
  await adminPage.locator('input[name="password"]').fill(admin.password);
  await adminPage.getByRole('button', { name: /login|ورود/i }).click();
  await adminPage.waitForURL(new RegExp(`${CMS_URL}/admin/?$`));
  await shot(adminPage, 'admin-dashboard');
  await adminPage.goto(`${CMS_URL}/admin/orders`);
  await adminPage.getByLabel(`کد رهگیری سفارش ${orderId}`).fill('IR1234567890');
  await shot(adminPage, 'admin-orders');
  await adminPage.getByLabel(`کد رهگیری سفارش ${orderId}`).press('Enter');
  await adminPage.getByRole('status').waitFor();
  await shot(adminPage, 'admin-shipped');
  await adminContext.close();

  await page.goto('/profile');
  await page.getByText('IR1234567890').waitFor();
  await shot(page, 'profile-shipped');
});
