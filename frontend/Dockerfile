# syntax=docker/dockerfile:1

# frontend/Dockerfile
FROM node:20-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/payload-cms/package.json ./backend/payload-cms/
COPY backend/nest-api/package.json ./backend/nest-api/

RUN pnpm install --frozen-lockfile

FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

COPY . .

WORKDIR /app/frontend

# These values must exist during next build because NEXT_PUBLIC_* values
# are embedded into the browser bundle at build time.
ARG NEXT_PUBLIC_PAYLOAD_URL
ARG NEXT_PUBLIC_NESTJS_API_URL
ARG NEXT_PUBLIC_FRONTEND_URL

ENV NEXT_PUBLIC_PAYLOAD_URL=$NEXT_PUBLIC_PAYLOAD_URL
ENV NEXT_PUBLIC_NESTJS_API_URL=$NEXT_PUBLIC_NESTJS_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL

RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static

RUN if [ -d /app/frontend/public ]; then \
      cp -a /app/frontend/public ./frontend/public; \
    fi

WORKDIR /app/frontend

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]