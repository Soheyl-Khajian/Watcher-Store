# End-to-end tests

Playwright tests of the production stack, with a mock Zarinpal gateway
(`zarinpal-mock/`) so purchases can be paid without any outside service:

- **purchase**: register, search, add to cart, change the quantity, check
  out, pay at the gateway, see the order paid; the administrator ships it
  in Payload's Orders view; the customer sees it shipped with its tracking
  code.
- **languages**: the same purchase in English, from sign-up to a paid
  order, with English messages throughout and the gateway returning the
  customer to the English page; bare addresses opening in the default
  language; the language switcher keeping the page and its search; the
  hreflang links between languages.
- **account**: a payment cancelled at the gateway cancels the order;
  logging out, and logging back in to the page that asked for it; the
  administrator cancelling a paid order (its payment listed for a refund)
  and recording the refund, which the customer then sees.
- **site**: the 404 page, the storefront's and the admin's security
  headers (every script carries the CSP nonce), the login redirect for
  account pages, the image credits page.

## Running them

1. Start the stack with the mock gateway (from the repository root, with a
   `.env` prepared as for `docker-compose.prod.yml`):

   ```bash
   docker compose -f docker-compose.prod.yml -f e2e/docker-compose.e2e.yml up -d --build
   ```

2. Fill it with the demo data, including a demo administrator:

   ```bash
   docker compose -f docker-compose.prod.yml -f e2e/docker-compose.e2e.yml exec \
     -e ALLOW_DEMO_SEED=true \
     -e DEMO_ADMIN_EMAIL=admin@example.test -e DEMO_ADMIN_PASSWORD=<password> \
     payload-cms ./node_modules/.bin/payload run src/seed-demo.ts
   ```

3. Run the tests with that administrator:

   ```bash
   E2E_ADMIN_EMAIL=admin@example.test E2E_ADMIN_PASSWORD=<password> pnpm test:stack
   ```

   Playwright's own Chromium is used unless `E2E_BROWSER_CHANNEL` names an
   installed browser (`msedge`, `chrome`); to get Chromium, run
   `pnpm --filter e2e exec playwright install chromium`.

Settings: `E2E_STOREFRONT_URL` (default `http://localhost:3002`),
`E2E_CMS_URL` (`http://localhost:3000`), `E2E_GATEWAY_URL`
(`http://localhost:4010`). Each run registers new customers, so the tests
can run again on the same stack.

The stack's Nest allows 30 logins a minute instead of 5
(`docker-compose.e2e.yml`): with no proxy in front, every storefront login
counts as the same client, and the tests log in more often than that. The
limit itself is tested in `backend/nest-api`'s API tests.

### Against apps run outside Docker

The tests also run against the three apps started by hand (development
servers, other ports), with the mock gateway started on its own
(`node e2e/zarinpal-mock/server.mjs`, port 4010). Point Nest at it
(`PAYMENT_GATEWAY=zarinpal`, `ZARINPAL_BASE_URL=http://127.0.0.1:4010`,
any UUID as `ZARINPAL_MERCHANT_ID`, `PAYMENT_CALLBACK_URL` at the
storefront's `/api/payment/callback`, and a higher
`RATE_LIMIT_LOGIN_PER_MINUTE`), and tell the tests the address Nest uses:
`E2E_GATEWAY_IN_STACK=http://127.0.0.1:4010`. The **site** tests need the
production build (its security headers).

Failures keep a trace (`playwright show-trace test-results/.../trace.zip`)
and a screenshot.

## In CI

The Docker job in `.github/workflows/ci.yml` does the same on every push
and pull request: builds the images, starts the stack with the mock
gateway, runs the smoke check, seeds the demo data with a one-off
administrator password, installs Playwright's Chromium and runs these
tests. When a test fails, the HTML report, traces and videos are uploaded
as the `e2e-report` artifact.

## README images

`capture/` walks through the seeded demo store and saves the screenshots
used in the README; `capture/build-assets.mjs` turns them into
`assets/demo.gif` and `assets/screenshots/`. Run it like the tests, with
`--config capture/capture.config.ts` and `CAPTURE_DIR` set to a folder, on
a freshly seeded store (the admin's Orders view would otherwise show the
tests' orders):

```bash
node e2e/capture/build-assets.mjs <CAPTURE_DIR> .   "$(cd backend/payload-cms && node -p "require.resolve('sharp')")"
```
