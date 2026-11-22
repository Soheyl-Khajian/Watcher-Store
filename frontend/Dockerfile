# syntax=docker/dockerfile:1

# frontend/Dockerfile
#
# Stages: base (pnpm) -> deps (packages) -> builder (next build) -> runner.
# The first stages match the other two Dockerfiles line for line, so the
# package download (pnpm fetch) is built once and shared by all three.

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

# Then only the storefront's packages, from the store (no network).
COPY package.json ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --offline --filter frontend

FROM deps AS builder

# Only the storefront's own sources: changes to the backends do not rebuild
# it.
COPY frontend ./frontend

WORKDIR /app/frontend

# These values must exist during next build because NEXT_PUBLIC_* values
# are embedded into the browser bundle at build time.
ARG NEXT_PUBLIC_PAYLOAD_URL
ARG NEXT_PUBLIC_FRONTEND_URL

ENV NEXT_PUBLIC_PAYLOAD_URL=$NEXT_PUBLIC_PAYLOAD_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

# The app's files belong to root and are read-only to the server; the only
# place it writes is Next's cache (fetched data, optimized images).
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
# The standalone output does not include public/; copy it from the builder.
COPY --from=builder /app/frontend/public ./frontend/public
# The base image's package managers are not used at runtime; removing them
# removes their dependencies' vulnerabilities from the image.
RUN mkdir -p frontend/.next/cache && chown node:node frontend/.next/cache \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node

WORKDIR /app/frontend

EXPOSE 3002

# Liveness only (see app/api/health): a Payload or Nest outage must not get
# this container restarted.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
