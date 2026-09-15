# syntax=docker/dockerfile:1

# backend/payload-cms/Dockerfile
# --- Base stage: Node + pnpm ---
  FROM node:20-alpine AS base
  ENV PNPM_HOME="/pnpm"
  ENV PATH="$PNPM_HOME:$PATH"
  RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
  
  # --- Dependencies stage ---
  FROM base AS deps
  WORKDIR /app
  
  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
  COPY frontend/package.json ./frontend/
  COPY backend/payload-cms/package.json ./backend/payload-cms/
  COPY backend/nest-api/package.json ./backend/nest-api/
  
  RUN pnpm install --frozen-lockfile
  
  # --- Builder stage ---
  FROM base AS builder
  WORKDIR /app
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=deps /app/backend/payload-cms/node_modules ./backend/payload-cms/node_modules
  
  COPY . .
  
  WORKDIR /app/backend/payload-cms
  RUN pnpm build
  
  # --- Runner stage ---
  FROM base AS runner
  WORKDIR /app/backend/payload-cms
  
  ENV NODE_ENV=production
  ENV PORT=3000
  
  COPY --from=builder /app/backend/payload-cms/.next ./.next
  COPY --from=builder /app/backend/payload-cms/dist ./dist
  COPY --from=builder /app/backend/payload-cms/node_modules ./node_modules
  COPY --from=builder /app/backend/payload-cms/package.json ./package.json
  COPY --from=builder /app/backend/payload-cms/src ./src
  
  EXPOSE 3000
  
  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000/admin', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"
  
  CMD ["pnpm", "start"]