// e2e/tests/env.ts -> where the stack is, and the demo administrator.

export const STOREFRONT_URL =
  process.env.E2E_STOREFRONT_URL ?? 'http://localhost:3002';
export const CMS_URL = process.env.E2E_CMS_URL ?? 'http://localhost:3000';

// The gateway address Nest hands to browsers (ZARINPAL_BASE_URL in
// docker-compose.e2e.yml) is a container name; the tests' browser reaches
// the same mock at its published port.
export const GATEWAY_IN_STACK = 'http://zarinpal-mock:4010';
export const GATEWAY_FROM_TESTS =
  process.env.E2E_GATEWAY_URL ?? 'http://localhost:4010';

export function adminAccount(): { email: string; password: string } {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to the demo administrator (DEMO_ADMIN_* given to seed:demo).',
    );
  }
  return { email, password };
}

// Order numbers are shown with Persian digits.
export const persianDigits = (value: number | string): string =>
  String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
