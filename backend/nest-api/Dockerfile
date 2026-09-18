# syntax=docker/dockerfile:1

# backend/nest-api/Dockerfile
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

RUN pnpm --filter nest-api build

# Create an isolated production installation without workspace symlinks.
RUN pnpm --filter nest-api deploy --prod /out

# Ensure the compiled application is present in the deploy directory.
RUN cp -a backend/nest-api/dist /out/dist

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /out ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]