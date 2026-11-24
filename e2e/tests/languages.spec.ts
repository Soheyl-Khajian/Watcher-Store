// e2e/tests/languages.spec.ts
//
// The storefront in English, and moving between languages: an English
// customer's purchase from sign-up to a paid order, addresses without a
// language, and the language switcher.

import { expect, test, type Page } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { GATEWAY_FROM_TESTS, GATEWAY_IN_STACK } from './env';

const PRODUCT = 'چشمی دزدگیر PIR دیواری';

async function reachGateway(page: Page) {
  await page.route(`${GATEWAY_IN_STACK}/**`, (route) =>
    route.continue({
      url: route.request().url().replace(GATEWAY_IN_STACK, GATEWAY_FROM_TESTS),
    }),
  );
}

test('a bare address opens in the default language', async ({ page }) => {
  await page.goto('/products');
  await expect(page).toHaveURL(/\/fa\/products$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
});

test('an English customer buys a product and pays', async ({ page }) => {
  await reachGateway(page);
  const email = `e2e-en-${Date.now()}@example.test`;
  const password = `e2e-${randomBytes(12).toString('hex')}-Pw`;

  await page.goto('/en/register');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en$/);

  await page.getByLabel('Search products').fill('PIR');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/products\?q=PIR/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Results for',
  );

  // Catalogue content shows as entered, whatever the page's language.
  await page.getByRole('link', { name: PRODUCT }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PRODUCT);
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('button', { name: 'Open cart, 1 item' }).click();
  await expect(page.getByRole('dialog')).toContainText('1 item in your cart.');
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);

  // The form's messages are English too.
  await page.getByRole('button', { name: 'Place order and pay' }).click();
  await expect(page.getByText("Enter the recipient's name.")).toBeVisible();

  await page.getByLabel("Recipient's full name").fill('Test Customer');
  await page.getByLabel('Mobile number').fill('09120000000');
  await page.getByLabel('Province').fill('Tehran');
  await page.getByLabel('City').fill('Tehran');
  await page.getByLabel('Full address').fill('Test street, No. 1');
  await page.getByLabel('Postal code').fill('1234567890');
  await page.getByRole('button', { name: 'Place order and pay' }).click();

  // Back from the gateway, still in English.
  await expect(page).toHaveURL(/\/en\/payment\/result\?orderId=\d+/, {
    timeout: 30_000,
  });
  const orderId = new URL(page.url()).searchParams.get('orderId');
  await expect(
    page.getByRole('heading', { name: 'Payment successful' }),
  ).toBeVisible();

  await page.goto('/en/profile');
  const card = page.getByRole('listitem').filter({
    has: page.getByRole('heading', { name: `Order #${orderId}` }),
  });
  await expect(card).toContainText('Processing');
});

test('the language switcher keeps the page and its search', async ({
  page,
}) => {
  await page.goto('/en/products?q=PIR');
  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('menuitem', { name: 'فارسی' }).click();
  await expect(page).toHaveURL(/\/fa\/products\?q=PIR$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('each language links to the other', async ({ page }) => {
  await page.goto('/en/products');
  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) =>
      Object.fromEntries(
        links.map((l) => [
          l.getAttribute('hreflang'),
          new URL(l.getAttribute('href')!).pathname,
        ]),
      ),
    );
  expect(alternates).toMatchObject({
    fa: '/fa/products',
    en: '/en/products',
    'x-default': '/fa/products',
  });
});
