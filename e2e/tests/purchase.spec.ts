// e2e/tests/purchase.spec.ts
//
// A customer's whole purchase, through the real stack: register, search,
// add to cart, change the quantity, check out, pay at the (mock) gateway,
// see the order paid; then the administrator ships it in Payload and the
// customer sees it shipped with its tracking code.

import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import {
  adminAccount,
  CMS_URL,
  GATEWAY_FROM_TESTS,
  GATEWAY_IN_STACK,
  persianDigits,
} from './env';

const PRODUCT = 'چشمی دزدگیر PIR دیواری';
// Two units of the product: ۱٬۳۸۰٬۰۰۰ toman.
const TWO_UNITS = /۱[,٬]۳۸۰[,٬]۰۰۰/;

test.describe.configure({ mode: 'serial' });

// The browser cannot resolve the gateway's in-stack name: send those
// requests to the mock's published port (a real gateway is a public site).
async function reachGateway(page: Page) {
  await page.route(`${GATEWAY_IN_STACK}/**`, (route) =>
    route.continue({
      url: route.request().url().replace(GATEWAY_IN_STACK, GATEWAY_FROM_TESTS),
    }),
  );
}

let orderId = 0;
const trackingCode = `E2E-${Date.now()}`;

test('a new customer buys a product and pays', async ({ page }) => {
  await reachGateway(page);
  const email = `e2e-${Date.now()}@example.test`;
  // A new account each run, with a password from a secure random source.
  const password = `e2e-${randomBytes(12).toString('hex')}-Pw`;

  // Register (and be logged in straight away).
  await page.goto('/register');
  await page.getByLabel('ایمیل').fill(email);
  await page.getByLabel('رمز عبور', { exact: true }).fill(password);
  await page.getByLabel('تکرار رمز عبور').fill(password);
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Search, and open the product.
  await page.getByLabel('جستجوی محصول').fill('دزدگیر');
  await page.getByRole('button', { name: 'جستجو', exact: true }).click();
  await expect(page).toHaveURL(/\/products\?q=/);
  await page.getByRole('link', { name: PRODUCT }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PRODUCT);

  // Add to cart, then make it two in the cart.
  await page.getByRole('button', { name: 'افزودن به سبد خرید' }).click();
  await page.getByRole('button', { name: /باز کردن سبد خرید، ۱ کالا/ }).click();
  await page.getByRole('button', { name: `یکی بیشتر از ${PRODUCT}` }).click();
  await expect(
    page.getByRole('group', { name: `تعداد ${PRODUCT}` }),
  ).toContainText('۲');
  // Two units at the unit price (the separator may be , or ٬).
  await expect(page.getByRole('dialog')).toContainText(TWO_UNITS);

  // Check out.
  await page.getByRole('link', { name: 'ادامه و تسویه حساب' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel('نام و نام خانوادگی گیرنده').fill('مشتری آزمایشی');
  await page.getByLabel('شماره موبایل').fill('09120000000');
  await page.getByLabel('استان').fill('تهران');
  await page.getByLabel('شهر').fill('تهران');
  await page.getByLabel('نشانی کامل').fill('خیابان آزمایش، پلاک ۱');
  await page.getByLabel('کد پستی').fill('1234567890');
  await page.getByRole('button', { name: 'ثبت سفارش و پرداخت' }).click();

  // The gateway pays and sends the customer back: the result page reads the
  // order's status from the server.
  await expect(page).toHaveURL(/\/payment\/result\?orderId=\d+/, {
    timeout: 30_000,
  });
  orderId = Number(new URL(page.url()).searchParams.get('orderId'));
  await expect(
    page.getByRole('heading', { name: 'پرداخت موفق' }),
  ).toBeVisible();

  // The profile shows the paid order (two units).
  await page.goto('/profile');
  const card = page.getByRole('listitem').filter({
    has: page.getByRole('heading', {
      name: `سفارش #${persianDigits(orderId)}`,
    }),
  });
  await expect(card).toContainText('در حال پردازش');
  await expect(card).toContainText(TWO_UNITS);

  // Keep the customer's session for the last test.
  await page.context().storageState({ path: 'test-results/.customer.json' });
});

test('the administrator ships the order in Payload', async ({ page }) => {
  test.skip(!orderId, 'needs the order from the previous test');
  const admin = adminAccount();

  await page.goto(`${CMS_URL}/admin/login`);
  // By field name: the admin follows the browser's language (Persian here).
  await page.locator('input[name="email"]').fill(admin.email);
  await page.locator('input[name="password"]').fill(admin.password);
  await page.getByRole('button', { name: /login|ورود/i }).click();
  await expect(page).toHaveURL(new RegExp(`${CMS_URL}/admin/?$`));

  await page.goto(`${CMS_URL}/admin/orders`);
  await page.getByLabel(`کد رهگیری سفارش ${orderId}`).fill(trackingCode);
  await page.getByLabel(`کد رهگیری سفارش ${orderId}`).press('Enter');

  await expect(page.getByRole('status')).toContainText(
    `سفارش ${persianDigits(orderId)} به «ارسال‌شده» تغییر کرد.`,
  );
});

test('the customer sees the order shipped, with its tracking code', async ({
  browser,
}) => {
  test.skip(!orderId, 'needs the order from the first test');
  const context = await browser.newContext({
    storageState: 'test-results/.customer.json',
  });
  const page = await context.newPage();

  await page.goto('/profile');
  const card = page.getByRole('listitem').filter({
    has: page.getByRole('heading', {
      name: `سفارش #${persianDigits(orderId)}`,
    }),
  });
  await expect(card).toContainText('ارسال‌شده');
  await expect(card).toContainText(trackingCode);
  await context.close();
});
