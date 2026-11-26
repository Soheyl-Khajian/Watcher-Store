# syntax=docker/dockerfile:1

# backend/nest-api/Dockerfile
#
# Stages: base (pnpm) -> deps (packages) -> builder (nest build, production
# install) -> runner. The first stages match the other two Dockerfiles line
# for line, so the package download (pnpm fetch) is built once and shared
# by all three.

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

FROM base AS deps

# Every package in the lockfile goes into pnpm's store. This layer changes
# only when the lockfile does, not when a package.json script changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile

# Then only the API's packages, from the store (no network).
COPY package.json ./
COPY backend/nest-api/package.json ./backend/nest-api/
RUN pnpm install --frozen-lockfile --offline --filter nest-api

FROM deps AS builder

# Only the API's own sources: changes to the other apps do not rebuild it.
COPY backend/nest-api ./backend/nest-api

RUN pnpm --filter nest-api build

# A self-contained production install (no dev dependencies, no workspace
# links), plus the compiled app.
RUN pnpm --filter nest-api deploy --prod --prefer-offline /out \
  && cp -a backend/nest-api/dist /out/dist

FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Owned by root and read-only to the server, which writes nothing to disk.
COPY --from=builder /out ./
# The base image's package managers are not used at runtime; removing them
# removes their dependencies' vulnerabilities from the image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

USER node

EXPOSE 3001

# Liveness only (GET /health); readiness is GET /health/ready.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
