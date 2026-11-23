# Architecture

How the three applications divide the work, how a customer is
authenticated, and how an order moves from the cart to the customer's door.

## Services

```mermaid
flowchart TB
  browser([Browser])
  admin([Administrator])
  storefront["Storefront · Next.js 15<br/>published :3002"]
  payload["Payload CMS 3 · admin + API<br/>published :3000"]
  nest["Nest API · NestJS 10<br/>internal :3001"]
  gateway{{"Zarinpal gateway"}}
  db[("PostgreSQL 14<br/>payload_schema · nest_schema")]
  media[("Media<br/>volume or S3 bucket")]

  browser -->|pages, /api BFF routes, /uploads| storefront
  browser -.->|pays on the gateway's page| gateway
  admin -->|admin panel| payload
  storefront -->|catalog, content, media| payload
  storefront -->|cart, orders, payment| nest
  payload -->|Orders view, order actions| nest
  nest -->|login check, product prices| payload
  nest <-->|request, verify| gateway
  payload --> db
  nest --> db
  payload --> media
```

The browser also reads product details from Payload's API for the cart
and checkout, and Payload tells the storefront when content changes (see
[Caching](#caching-and-content-updates)).

| Service    | Owns                                                                         | Database role                                                                                                              |
| ---------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Payload    | Users and roles, catalog (categories, products, stock), posts, pages, media  | `payload_app`, owner of `payload_schema`                                                                                   |
| Nest       | Carts, orders, payments, order expiry and payment reconciliation jobs        | `nest_app`, owner of `nest_schema`; reads `users (id, email, role)`, reads and updates `products (stock)` column by column |
| Storefront | No data of its own: renders Payload content and fronts Nest for the customer | none                                                                                                                       |

Migrations run as one-off jobs before the services start (`payload-migrate`,
`nest-migrate`), after `db-roles` has created the roles and schemas
(`deploy/postgres/`).

## Logging in (backend-for-frontend)

The browser never holds a token. The storefront's own `/api` routes keep
Nest's JWT in an httpOnly cookie and call Nest on the customer's behalf.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant S as Storefront /api
  participant N as Nest
  participant P as Payload

  B->>S: POST /api/auth/login (Origin + x-watcher-csrf header)
  S->>N: POST /auth/login
  N->>P: POST /api/users/login (checks the password)
  P-->>N: user
  N-->>S: JWT (HS256, issuer and audience pinned)
  S-->>B: Set-Cookie __Host-ws_session (httpOnly, Secure, SameSite=Lax)
  B->>S: POST /api/nest/cart (cookie)
  S->>N: POST /cart (Authorization: Bearer JWT, client IP, request id)
  N-->>S: cart
  S-->>B: cart
```

Mutating `/api` calls must come from the storefront's own origin and carry
the `x-watcher-csrf` header. The `/api/nest/*` proxy forwards only an
allow-list of paths and methods.

## Paying

Stock is reserved when the order is placed, so a paid order can always be
fulfilled. The gateway's redirect only says where to look: Nest verifies
every payment with the gateway, server to server, before the order changes.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant S as Storefront
  participant N as Nest
  participant Z as Zarinpal

  B->>S: Checkout (Idempotency-Key)
  S->>N: POST /orders
  Note over N: one transaction: lock the cart, take the stock,<br/>create the order (pending)
  B->>S: Pay
  S->>N: POST /payment/initiate
  N->>Z: request.json (amount in rial, callback URL)
  Z-->>N: authority
  N-->>B: gateway payment page URL
  B->>Z: pays
  Z-->>B: redirect to /api/payment/callback?Authority&Status
  B->>S: GET /api/payment/callback
  S->>N: GET /payment/callback
  N->>Z: verify.json (authority, expected amount)
  Z-->>N: code 100 (paid) or 101 (already verified)
  Note over N: one transaction: payment paid, order processing
  N-->>B: redirect to /payment/result?orderId
  B->>S: result page reads the order's status from the server
```

If the customer pays and closes the browser before coming back, the
reconciliation job asks the gateway about payments still pending after
`PAYMENT_RECONCILE_AFTER_MINUTES` and settles them the same way. A replayed
callback changes nothing: the payment is no longer pending.

## Order states

Every status change goes through one state machine
(`backend/nest-api/src/orders/order-state.ts`), inside a transaction that
locks the order row.

```mermaid
stateDiagram-v2
  [*] --> pending: order placed (stock reserved)
  pending --> processing: payment verified
  pending --> cancelled: customer or admin cancels,<br/>payment fails, or not paid in time
  processing --> shipped: admin ships (optional tracking code)
  processing --> cancelled: admin cancels (refund owed)
  shipped --> completed: admin records delivery
  completed --> [*]
  cancelled --> [*]
```

- Cancelling puts the reserved stock back.
- Unpaid orders are cancelled after `PENDING_ORDER_TTL_HOURS` by the expiry
  job, which takes each order with `FOR UPDATE SKIP LOCKED`, so several API
  instances can run it at once.
- A refund is tracked separately (`none`, `required`, `refunded`): an order
  cancelled after payment, or a payment that arrives for an order already
  cancelled, is marked `required` and shown in the admin's Orders view until
  an administrator marks it refunded.

## Payments

```mermaid
stateDiagram-v2
  [*] --> pending: initiated at the gateway
  pending --> paid: verified with the gateway
  pending --> failed: gateway says unpaid
  paid --> [*]
  failed --> [*]
```

Amounts are kept in toman and sent to the gateway in rial (× 10); the
verification must report the same amount.

## Caching and content updates

Storefront pages render per request (each carries a new CSP nonce), on top
of cached data: products for 60 seconds, everything else for an hour, each
fetch tagged by collection. When content changes in Payload, its hooks call
the storefront's `POST /api/revalidate` (with `REVALIDATE_SECRET`) and the
affected tags are dropped at once.

## Media

Payload stores uploads on a volume or, with `S3_BUCKET` set, in an
S3-compatible bucket; either way they are served through Payload with its
access rules. The storefront shows them from its own `/uploads/<file>`,
fetched from Payload's internal address, so `next/image` can optimize them
and the CSP allows images only from the shop itself.
