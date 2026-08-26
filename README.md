# Watcher Store

Persian-language (RTL) storefront for security, CCTV, solar, and smart-home equipment.

This is a **pnpm workspace** with three TypeScript apps and one PostgreSQL database (two schemas). Payload CMS owns catalog, content, and user identity. NestJS owns cart, orders, and a **mock** payment flow. Next.js is the public storefront.

The supported way to run this project is a **VS Code / Cursor Dev Container**. Docker starts Postgres, the editor installs dependencies, Payload migrations run, and all three apps start. You should not need to install Node, pnpm, or Postgres on the host.

> Payment is simulated. This is not a production checkout.

---

## Architecture

```
Browser  (Next.js storefront :3002)
  ├─ catalog, blog, CMS pages, register  →  Payload REST  :3000
  └─ login, cart, orders, payment        →  NestJS API    :3001
                                              │
                                              ├─ POST Payload /api/users/login
                                              ├─ issues its own JWT
                                              └─ reads product prices from Payload
PostgreSQL (Compose service "db")
  payload_schema   (Payload migrations, push: false)
  nest_schema      (TypeORM, synchronize: true)
```

| App          | Path                   | Stack                                     | Port | Role                                                    |
| ------------ | ---------------------- | ----------------------------------------- | ---- | ------------------------------------------------------- |
| Storefront   | `frontend/`            | Next.js 15, React 19, Tailwind 4, Zustand | 3002 | Public shop                                             |
| CMS          | `backend/payload-cms/` | Payload 3.49 on Next.js, Postgres adapter | 3000 | Users, products, categories, posts, pages, media, admin |
| Commerce API | `backend/nest-api/`    | NestJS 10, TypeORM, Passport JWT          | 3001 | Cart, orders, mock payment                              |

Workspace packages are those three folders (`pnpm-workspace.yaml`). There is no `apps/` or `packages/` directory.

---

## Prerequisites (host machine)

You need **Docker** and a **Dev Containers–capable editor**. You do not need Node, pnpm, or PostgreSQL installed on the host for the default workflow.

### 1. Docker

| OS      | What to install                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows | [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (WSL 2 backend recommended)                                                                                                         |
| macOS   | [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/)                                                                                                                                         |
| Linux   | [Docker Engine](https://docs.docker.com/engine/install/) + the [Compose plugin](https://docs.docker.com/compose/install/linux/), or [Docker Desktop for Linux](https://docs.docker.com/desktop/setup/install/linux/) |

Start Docker and confirm it is running before you open the project.

On Linux, your user should be able to run `docker` without root (typically membership in the `docker` group).

### 2. Editor + Dev Containers

| Editor             | Extension                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual Studio Code | [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) (`ms-vscode-remote.remote-containers`)                      |
| Cursor             | The same **Dev Containers** extension from the marketplace                                                                                                           |
| Other IDEs         | Use that product’s Dev Containers / “open in container” support if it implements the `.devcontainer/` spec. This repo is set up for the VS Code Dev Containers flow. |

The repo already contains:

- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.yml` (`app` + `db`)
- `.devcontainer/postgres-init/init-schemas.sh` (creates `payload_schema` and `nest_schema`)

---

## First-time setup

### 1. Clone

```bash
git clone https://github.com/Soheyl-Khajian/Watcher-Store.git
cd Watcher-Store
```

### 2. Create `.env`

In the **repository root** (same folder as `package.json` and `pnpm-workspace.yaml`):

```bash
cp .env.example .env
```

Edit `.env`:

- Set `PAYLOAD_SECRET` and `JWT_SECRET` to long random strings.
- Leave `DATABASE_HOST=db` as-is. `db` is the Compose service name. `localhost` is wrong **inside** the container.
- If you change `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB`, update `DATABASE_URI` to the same values.

Do not commit `.env`.

### 3. Reopen in the Dev Container

1. Open the **repository root** in VS Code or Cursor.
2. Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Dev Containers: Reopen in Container**.
3. Wait. First run builds the image, starts Postgres, installs pnpm, then `pnpm install`. That can take several minutes.
4. After the container is up, `postStartCommand` runs Payload migrations and `pnpm start:all`.

You do not run `pnpm install`, `docker compose`, or `pnpm start:all` on the host. The editor and Compose do that inside the container.

### 4. Open the apps

From the **host** browser:

| URL                         | What          |
| --------------------------- | ------------- |
| http://localhost:3002       | Storefront    |
| http://localhost:3000/admin | Payload admin |
| http://localhost:3001       | NestJS API    |

`forwardPorts` in `devcontainer.json` lists `3000` and `3001`. The storefront listens on **3002**. If 3002 is not forwarded automatically, use the editor **Ports** panel and forward `3002`, or add `3002` to `forwardPorts`.

### 5. Create the first admin user

Seed does **not** create a user. Open http://localhost:3000/admin and create the first user there. That user is the identity store. Storefront login goes Nest → Payload `/api/users/login` → Nest JWT.

---

## Optional: seed categories and footer

Not part of `postStartCommand`. Products are **not** seeded.

After the container is running, open a terminal **inside** the Dev Container (not a host terminal) and run:

```bash
pnpm --filter payload-cms seed
```

This upserts the category tree from `backend/payload-cms/seed-categories.json` and updates the footer global from `backend/payload-cms/seed-footer.json`. Safe to re-run (existing categories are skipped).

Without seed, add categories, footer, and products yourself in Payload admin.

---

## What the Dev Container starts

Defined in `.devcontainer/`:

| Step                | What                                                          |
| ------------------- | ------------------------------------------------------------- |
| Compose `db`        | `postgres:14-alpine`, host port **5433** → container `5432`   |
| Init script         | `CREATE SCHEMA` `payload_schema` and `nest_schema`            |
| Compose `app`       | Workspace mounted at `/workspace`, `env_file: ../.env`        |
| `postCreateCommand` | `npm install -g pnpm && pnpm install`                         |
| `postStartCommand`  | `pnpm --filter payload-cms run migrate && pnpm run start:all` |

`pnpm start:all` runs Payload (`:3000`), Nest (`:3001`), and the storefront (`:3002`) with `concurrently`.

Individual scripts (from the repo root, **inside** the container):

```bash
pnpm start:payload
pnpm start:nest
pnpm start:frontend
```

---

## What works today

- Catalog: nested categories, product gallery, specs, list price vs `salePrice`
- CMS: products, categories, posts, pages, footer, media; admin UI in English and Persian
- Auth: register via Payload; login via Nest (Payload validates credentials, Nest issues JWT)
- Cart and order history (JWT required)
- Checkout with **mock** payment (`?status=success` on the verify URL)
- Admin bulk price adjust on a category and its descendants (discount writes `salePrice` and `isOnSale`; increase mutates `price`)
- Idempotent seed for categories and footer

## Not production

- Mock payment — the client can choose success or failure
- JWT stored in `localStorage` (Zustand persist), not httpOnly cookies
- Nest TypeORM `synchronize: true` (no Nest migrations)
- No stock decrement, guest cart, real payment provider, email, search, reviews, or CI
- CORS and several service URLs assume `localhost`

---

## Project structure

```
Watcher-Store/
├── frontend/                      # Next.js storefront (:3002)
├── backend/
│   ├── payload-cms/               # Payload CMS (:3000)
│   └── nest-api/                  # NestJS commerce API (:3001)
├── .devcontainer/
│   ├── devcontainer.json
│   ├── docker-compose.yml
│   └── postgres-init/init-schemas.sh
├── .env.example
├── package.json
└── pnpm-workspace.yaml
```

---

## Scripts (inside the container, repo root)

| Command                                                | Purpose                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm install`                                         | Install workspace packages (`postCreateCommand` already does this)  |
| `pnpm start:all`                                       | Dev: CMS + Nest + storefront (`postStartCommand` already does this) |
| `pnpm start:payload` / `start:nest` / `start:frontend` | One process                                                         |
| `pnpm --filter payload-cms migrate`                    | Apply Payload SQL migrations                                        |
| `pnpm --filter payload-cms seed`                       | Optional: categories + footer                                       |
| `pnpm --filter nest-api build`                         | Compile NestJS                                                      |
| `pnpm --filter frontend build`                         | Next.js production build                                            |
| `pnpm --filter payload-cms build`                      | Payload / Next.js production build                                  |

---

## License

MIT
