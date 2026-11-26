# Changelog

Notable changes, newest first. Versions follow
[Semantic Versioning](https://semver.org/); the format follows
[Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — unreleased

The first release: the prototype from summer 2025 made safe to deploy,
tested end to end, and documented. Everything below is new or changed
since that prototype.

### Storefront

- Persian and English, each at its own address (`/fa/…`, `/en/…`), with a
  language switcher. Every language's text is written by hand; numbers,
  dates and prices follow the page's language. A deployment chooses the
  languages it offers.
- The "Signal" theme: slate with a green accent, in light and dark,
  following the system; Inter for Latin text, Vazirmatn for Persian.
- Product search, a paged blog, breadcrumbs on product pages, rich-text
  CMS content, error, not-found and loading pages.
- Cart quantity controls checked against stock; an order history with
  details, tracking codes, cancel and pay-again; a payment result page
  that reads the order's real status.
- Accessibility: landmarks and heading order, labelled and described form
  fields, visible focus, contrast checked in both themes, reduced motion.
- SEO: metadata and Open Graph images per page, a default share image,
  product and breadcrumb JSON-LD, hreflang links, a sitemap of every page
  in every language, robots.txt.

### Accounts and security

- The login token never reaches the browser: the storefront's own `/api`
  routes keep it in an httpOnly cookie (backend-for-frontend), with
  same-origin and custom-header checks on every change.
- Accounts are created only through the storefront; password reset is
  off; reads of Payload's API by anyone but an administrator are bounded.
- Security headers on both apps, with a nonce-based Content Security
  Policy on the storefront.
- Rate limits per real client; every service refuses placeholder secrets
  and default passwords in production.
- The footer could be changed by any customer, CMS links could carry
  `javascript:` addresses, and SVG uploads were accepted: all fixed.

### Orders and payments

- Zarinpal payments, verified server to server (amount included), with a
  local mock gateway for development and tests. The simulated payment of
  the prototype, which trusted the address bar, is gone.
- Stock is reserved when the order is placed and released when it is
  cancelled or expires, under row locks, so the last unit is sold once.
- Idempotent checkout; one state machine for every order status change.
- A reconciliation job settles payments whose customers never came back;
  it is safe to run on several API instances at once.
- Refunds tracked per payment, listed in the admin's Orders view.
- Carts hold at most 50 different products.

### Administration

- An Orders view in Payload: ship with a tracking code, record delivery,
  cancel, mark refunded, each with a confirmation.
- Bulk price changes per category, undone only for the products they
  changed; a stock value edited while orders were being placed is not
  overwritten.
- The first administrator from the environment (`seed-admin`), and a
  demo store (`seed-demo`) with 32 products photographed under open
  licences.

### Operations

- A production Docker Compose stack: PostgreSQL 18, a database role per
  service with column-level grants, migration jobs, non-root images
  without Linux capabilities, media on a volume or in an S3-compatible
  bucket, health and readiness checks, structured JSON logs.
- CI: format, lint, typecheck, build; unit, integration and API
  end-to-end tests; the production images smoke-tested, tested in a
  browser with Playwright and scanned with Trivy; secret scanning;
  CodeQL; Dependabot. Actions are pinned by commit and images by digest.
- [docs/operations.md](docs/operations.md): the first administrator,
  backups and restoring, upgrading, checking a deployment.

[1.0.0]: https://github.com/Soheyl-Khajian/Watcher-Store/releases/tag/v1.0.0
