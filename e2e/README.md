# End-to-end tests

Playwright tests of the production stack, with a mock Zarinpal gateway
(`zarinpal-mock/`) so purchases can be paid without any outside service:

- **purchase**: register, search, add to cart, change the quantity, check
  out, pay at the gateway, see the order paid; the administrator ships it
  in Payload's Orders view; the customer sees it shipped with its tracking
  code.
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
(`http://localhost:4010`). Each run registers a new customer, so the tests
can run again on the same stack.

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
`--config capture/capture.config.ts` and `CAPTURE_DIR` set to a folder.
