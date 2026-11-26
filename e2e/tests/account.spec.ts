// e2e/tests/account.spec.ts
//
// What happens around a purchase: a customer who cancels at the gateway,
// logging out and back in, and an administrator cancelling a paid order
// and recording its refund. Each test registers its own customer.

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

interface Customer {
  email: string;
  password: string;
}

// The browser cannot resolve the gateway's in-stack name: send those
// requests to the mock's published port. cancel: the customer presses
// "cancel" on the payment page (the mock then returns Status=NOK).
async function reachGateway(page: Page, { cancel = false } = {}) {
  await page.route(`${GATEWAY_IN_STACK}/**`, (route) => {
    const url = new URL(
      route.request().url().replace(GATEWAY_IN_STACK, GATEWAY_FROM_TESTS),
    );
    if (cancel && url.pathname.startsWith('/pg/StartPay/')) {
      url.searchParams.set('cancel', '1');
    }
    return route.continue({ url: url.toString() });
  });
}

// A new account, logged in straight away.
async function register(page: Page): Promise<Customer> {
  const customer = {
    email: `e2e-account-${Date.now()}-${randomBytes(3).toString('hex')}@example.test`,
    password: `e2e-${randomBytes(12).toString('hex')}-Pw`,
  };
  await page.goto('/register');
  await page.getByLabel('ایمیل').fill(customer.email);
  await page.getByLabel('رمز عبور', { exact: true }).fill(customer.password);
  await page.getByLabel('تکرار رمز عبور').fill(customer.password);
  await page.getByRole('button', { name: 'ثبت‌نام' }).click();
  await expect(page).toHaveURL(/\/fa$/);
  return customer;
}

// One unit of the product, through checkout to the gateway and back to the
// result page. Returns the order number.
async function buyOne(page: Page): Promise<number> {
  await page.goto(`/products?q=${encodeURIComponent('دزدگیر')}`);
  await page.getByRole('link', { name: PRODUCT }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PRODUCT);
  await page.getByRole('button', { name: 'افزودن به سبد خرید' }).click();
  await page.getByRole('button', { name: /باز کردن سبد خرید، ۱ کالا/ }).click();
  await page.getByRole('link', { name: 'ادامه و تسویه حساب' }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByLabel('نام و نام خانوادگی گیرنده').fill('مشتری آزمایشی');
  await page.getByLabel('شماره موبایل').fill('09120000000');
  await page.getByLabel('استان').fill('تهران');
  await page.getByLabel('شهر').fill('تهران');
  await page.getByLabel('نشانی کامل').fill('خیابان آزمایش، پلاک ۲');
  await page.getByLabel('کد پستی').fill('1234567890');
  await page.getByRole('button', { name: 'ثبت سفارش و پرداخت' }).click();
  await expect(page).toHaveURL(/\/payment\/result\?orderId=\d+/, {
    timeout: 30_000,
  });
  return Number(new URL(page.url()).searchParams.get('orderId'));
}

function orderCard(page: Page, orderId: number) {
  return page.getByRole('listitem').filter({
    has: page.getByRole('heading', {
      name: `سفارش #${persianDigits(orderId)}`,
    }),
  });
}

test('a payment cancelled at the gateway cancels the order', async ({
  page,
}) => {
  await reachGateway(page, { cancel: true });
  await register(page);

  const orderId = await buyOne(page);

  await expect(
    page.getByRole('heading', { name: 'پرداخت ناموفق' }),
  ).toBeVisible();
  await page.goto('/profile');
  const card = orderCard(page, orderId);
  await expect(card).toContainText('لغوشده');
  await expect(card).toContainText('به دلیل ناموفق بودن پرداخت لغو شد.');
});

test('a customer logs out, and logs back in to the page they asked for', async ({
  page,
}) => {
  const customer = await register(page);

  await page.getByRole('button', { name: 'حساب کاربری' }).click();
  await page.getByRole('menuitem', { name: 'خروج' }).click();
  await expect(page).toHaveURL(/\/fa$/);
  await expect(
    page.getByRole('banner').getByRole('link', { name: 'ورود' }),
  ).toBeVisible();

  // Account pages send a visitor to the login page, and back afterwards.
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('ایمیل').fill(customer.email);
  await page.getByLabel('رمز عبور').fill(customer.password);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'پروفایل من' }),
  ).toBeVisible();
});

test('the administrator cancels a paid order and records the refund', async ({
  page,
  browser,
}) => {
  await reachGateway(page);
  await register(page);
  const orderId = await buyOne(page);
  await expect(
    page.getByRole('heading', { name: 'پرداخت موفق' }),
  ).toBeVisible();

  const admin = adminAccount();
  const adminPage = await (await browser.newContext()).newPage();
  await adminPage.goto(`${CMS_URL}/admin/login`);
  await adminPage.locator('input[name="email"]').fill(admin.email);
  await adminPage.locator('input[name="password"]').fill(admin.password);
  await adminPage.getByRole('button', { name: /login|ورود/i }).click();
  await expect(adminPage).toHaveURL(new RegExp(`${CMS_URL}/admin/?$`));

  await adminPage.goto(`${CMS_URL}/admin/orders`);
  const row = () =>
    adminPage.locator('tbody tr').filter({
      has: adminPage.locator('td:first-child', {
        hasText: new RegExp(`^${orderId}$`),
      }),
    });

  // Cancelling asks for a second click, then flags the payment for a refund.
  await row().getByText('لغو سفارش', { exact: true }).click();
  await row()
    .getByRole('button', { name: /تأیید لغو سفارش/ })
    .click();
  // Payload has a status region of its own; this is the Orders view's.
  await expect(
    adminPage
      .getByRole('status')
      .filter({ hasText: `سفارش ${persianDigits(orderId)}` }),
  ).toContainText('لغو شد و موجودی کالاها برگشت.');
  await expect(row()).toContainText('نیاز به بازپرداخت');
  await expect(row()).toContainText('شماره پیگیری');

  // The money went back (in the gateway's panel): record it.
  await row().getByText('بازپرداخت انجام شد', { exact: true }).click();
  await row()
    .getByRole('button', { name: /تأیید بازپرداخت سفارش/ })
    .click();
  await expect(
    adminPage
      .getByRole('status')
      .filter({ hasText: `سفارش ${persianDigits(orderId)}` }),
  ).toContainText('به‌عنوان «بازپرداخت شد» علامت خورد.');
  await expect(row()).toContainText('بازپرداخت شد');
  await adminPage.context().close();

  // The customer sees it cancelled by the shop, and refunded.
  await page.goto('/profile');
  const card = orderCard(page, orderId);
  await expect(card).toContainText('لغوشده');
  await expect(card).toContainText('توسط فروشگاه لغو شد.');
  await expect(card).toContainText('مبلغ پرداختی به شما بازگردانده شد.');
});
