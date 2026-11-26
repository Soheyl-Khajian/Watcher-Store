# Running the production stack

How to look after a deployment of `docker-compose.prod.yml`: the first
administrator, backups, restoring, moving to Postgres 18, checking a
deployment, and the reverse proxy. The commands run in the repository
directory on the server, next to its `.env`.

```bash
# Shorter commands below.
alias dc='docker compose -f docker-compose.prod.yml'
```

## The first administrator

Create it from the environment once the stack is up. `seed-admin` does
nothing if the administrator exists, so it is safe to run again. The
password is read into a variable first, so it never appears in the shell
history or in the process list (`-e ADMIN_PASSWORD` without a value passes
the variable through):

```bash
read -rsp 'Administrator password: ' ADMIN_PASSWORD && export ADMIN_PASSWORD
dc exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD \
  payload-cms ./node_modules/.bin/payload run src/seed-admin.ts
unset ADMIN_PASSWORD
```

Until an administrator exists, Payload's first-user screen
(`/admin/create-first-user`) is open to anyone who reaches it, so create
the administrator before the CMS is published.

The demo store (`seed-demo.ts` with `ALLOW_DEMO_SEED=true`, see the README)
is only for a deployment meant as a demo.

## Backups

Two things hold the shop's data: the database, and the uploaded media
(the `payload-media` volume, unless `S3_BUCKET` puts them in a bucket,
which then needs the provider's own backups).

```bash
# Database: a compressed custom-format dump, taken while the shop runs.
dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "watcher-db-$(date +%F).dump"

# Media on the volume.
dc exec -T payload-cms tar czf - -C /app/media . \
  > "watcher-media-$(date +%F).tgz"
```

Keep copies off the server, and try a restore now and then: a backup that
has never been restored is a hope, not a backup.

## Restoring

Into a stack whose database volume is empty (a new server, or after
`dc down -v`):

```bash
# The database, and the roles and schemas the services connect with.
dc up -d db db-roles

# The dump replaces what the roles job created.
dc exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --single-transaction' \
  < watcher-db-2026-11-26.dump

# Media, then everything else (migrations run if the dump is older).
dc up -d payload-cms
dc exec -T payload-cms tar xzf - -C /app/media < watcher-media-2026-11-26.tgz
dc up -d
```

The jobs run on every `up`, so the roles' passwords and Nest's access to
Payload's tables are set again from `.env`.

## Moving to Postgres 18

Postgres 14 data cannot be opened by Postgres 18; it has to be dumped and
restored. Postgres 18 also keeps its data in a different place in its
volume, so this version uses a new volume (`postgres18-data`) and leaves
the old one (`postgres-data`) as it was.

On a server that ran an earlier version of this stack:

1. Before updating the code, take a database backup (above) with the old
   stack still running.
2. Update the code, then restore the backup (above) into the new, empty
   volume.
3. Once the shop works, remove the old volume:
   `docker volume rm <project>_postgres-data` (`docker volume ls` lists it).

The Dev Container moves the same way. Its database is also a new volume,
so after the update it starts empty; to keep your development data, dump
it before rebuilding the container and restore it afterwards:

```bash
# Before: the old database container is still running.
docker exec watcher-store_devcontainer-db-1 \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > dev.dump

# After rebuilding the container.
docker exec -i watcher-store_devcontainer-db-1 \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  < dev.dump
```

The old volume, `watcher-store_devcontainer_postgres-data`, stays until you
remove it.

## Checking a deployment

`scripts/smoke-check.mjs` asks every service whether it is ready, loads
real pages, and creates a customer account to log in with. Nest has no
published port, so run it inside the stack's network (named after the
project, usually the directory: `docker network ls`), with the
storefront's public address as the origin its forms come from:

```bash
docker run --rm --network watcher-store_default \
  -v "$PWD/scripts:/scripts:ro" \
  -e PAYLOAD_URL=http://payload-cms:3000 \
  -e NEST_URL=http://nest-api:3001 \
  -e FRONTEND_URL=http://frontend:3002 \
  -e FRONTEND_PUBLIC_ORIGIN=https://shop.example \
  node:24-alpine node /scripts/smoke-check.mjs
```

Each run leaves two customer accounts behind (`smoke-…@example.test` and
`smoke-bff-…@example.test`); delete them in the admin panel's users list
afterwards. CI runs the same check on a throwaway stack.

## Behind a reverse proxy

The stack publishes the storefront (3002) and Payload (3000) on
`127.0.0.1` only, for a reverse proxy on the same server (Caddy, nginx)
that terminates TLS.

Set `TRUSTED_PROXY_HOPS=1` there. Nest limits requests per customer
(logins, orders), and learns the customer's address from the storefront,
which reads it from `X-Forwarded-For`. That header is only trustworthy as
far as your own proxies wrote it:

- `0` (the default) is right when browsers reach the storefront directly.
  The header then holds whatever the browser sent, so the storefront
  ignores it, and Nest's limits apply to all those customers together:
  safe, but one busy client can slow the others.
- `1` behind one proxy that adds the client's address. The storefront
  takes the last address in the header, the one your proxy added.
- A higher number only if requests really pass through that many proxies
  of your own (a CDN, then a load balancer). Too high, and a client can
  choose the address the limits see.
