# syntax=docker/dockerfile:1

# backend/payload-cms/Dockerfile
#
# Stages: base (pnpm) -> deps (packages) -> builder (next build, production
# install) -> runner. The first stages match the other two Dockerfiles line
# for line, so the package download (pnpm fetch) is built once and shared
# by all three.

FROM node:24-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

FROM base AS deps

# Every package in the lockfile goes into pnpm's store. This layer changes
# only when the lockfile does, not when a package.json script changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile

# Then only the CMS's packages, from the store (no network).
COPY package.json ./
COPY backend/payload-cms/package.json ./backend/payload-cms/
RUN pnpm install --frozen-lockfile --offline --filter payload-cms

FROM deps AS builder

# Only the CMS's own sources: changes to the other apps do not rebuild it.
COPY backend/payload-cms ./backend/payload-cms

# Payload evaluates its environment schema during next build.
# These are build-only placeholders; runtime values come from Compose.
ARG PAYLOAD_SECRET=build-only-secret-00000000000000000000000000000000
ARG DATABASE_URI=postgres://postgres:postgres@127.0.0.1:5432/watcher_store?schema=payload_schema
ARG PAYLOAD_SCHEMA=payload_schema
ARG FRONTEND_URL=http://localhost:3002

ENV PAYLOAD_SECRET=${PAYLOAD_SECRET}
ENV DATABASE_URI=${DATABASE_URI}
ENV PAYLOAD_SCHEMA=${PAYLOAD_SCHEMA}
ENV FRONTEND_URL=${FRONTEND_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter payload-cms build

# A self-contained production install (no dev dependencies, no workspace
# links), plus what next start and payload migrate read at runtime: the
# build output, the config and the sources (collections, migrations).
RUN pnpm --filter payload-cms deploy --prod --prefer-offline /out \
  && cp -a backend/payload-cms/src /out/src \
  && cp -a backend/payload-cms/.next /out/.next \
  && rm -rf /out/.next/cache \
  && cp -a backend/payload-cms/next.config.mjs /out/next.config.mjs \
  && if [ -d backend/payload-cms/public ]; then \
       cp -a backend/payload-cms/public /out/public; \
     fi

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS=--no-deprecation

# The app's files belong to root and are read-only to the server. It writes
# only uploads (media/, a volume in production) and Next's cache.
COPY --from=builder /out ./
RUN mkdir -p media .next/cache && chown node:node media .next/cache

USER node

EXPOSE 3000

# Liveness: the server answers its API (cheaper than rendering the admin).
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --start-interval=2s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/users/me', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["./node_modules/.bin/next", "start"]
