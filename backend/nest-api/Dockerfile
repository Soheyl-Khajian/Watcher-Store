# syntax=docker/dockerfile:1

# backend/nest-api/Dockerfile
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
    COPY --from=deps /app/backend/nest-api/node_modules ./backend/nest-api/node_modules
    
    COPY . .
    
    WORKDIR /app/backend/nest-api
    RUN pnpm build
    
    # --- Runner stage ---
    FROM base AS runner
    WORKDIR /app/backend/nest-api
    
    ENV NODE_ENV=production
    ENV PORT=3001
    
    COPY --from=builder /app/backend/nest-api/dist ./dist
    COPY --from=builder /app/backend/nest-api/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    
    EXPOSE 3001
    
    HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3001/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"
    
    CMD ["node", "dist/main"]