# syntax=docker/dockerfile:1

# backend/payload-cms/Dockerfile
FROM node:20-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/payload-cms/package.json ./backend/payload-cms/
COPY backend/nest-api/package.json ./backend/nest-api/

RUN pnpm install --frozen-lockfile

COPY . .

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

RUN pnpm --filter payload-cms build

# Create an isolated production installation without workspace symlinks.
RUN pnpm --filter payload-cms deploy --prod /out

RUN cp -a backend/payload-cms/src /out/src

# Copy the actual Next.js build output into the deploy directory.
RUN cp -a backend/payload-cms/.next /out/.next
RUN cp -a backend/payload-cms/next.config.mjs /out/next.config.mjs
RUN if [ -d backend/payload-cms/public ]; then \
      cp -a backend/payload-cms/public /out/public; \
    fi

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /out ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/admin', (r) => process.exit(r.statusCode >= 200 && r.statusCode < 400 ? 0 : 1)).on('error', () => process.exit(1))"

ENV NODE_OPTIONS=--no-deprecation

CMD ["./node_modules/.bin/next", "start"]