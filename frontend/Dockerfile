# syntax=docker/dockerfile:1

# frontend/Dockerfile
# --- Base stage: Node + pnpm ---
    FROM node:20-alpine AS base
    ENV PNPM_HOME="/pnpm"
    ENV PATH="$PNPM_HOME:$PATH"
    RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
    
    # --- Dependencies stage ---
    FROM base AS deps
    WORKDIR /app
    
    # Copy workspace manifests
    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
    
    # Copy package manifests for all workspace packages
    COPY frontend/package.json ./frontend/
    COPY backend/payload-cms/package.json ./backend/payload-cms/
    COPY backend/nest-api/package.json ./backend/nest-api/
    
    # Install dependencies for the whole workspace
    RUN pnpm install --frozen-lockfile
    
    # --- Builder stage ---
    FROM base AS builder
    WORKDIR /app
    
    # Copy installed node_modules from deps stage
    COPY --from=deps /app/node_modules ./node_modules
    COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
    
    # Copy source code
    COPY . .
    
    # Build the frontend
    WORKDIR /app/frontend
    RUN pnpm build
    
    # --- Runner stage ---
    FROM base AS runner
    WORKDIR /app/frontend
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    ENV PORT=3002
    ENV HOSTNAME="0.0.0.0"
    
    # Copy standalone output only
    COPY --from=builder /app/frontend/.next/standalone ./
    COPY --from=builder /app/frontend/.next/static ./.next/static
    COPY --from=builder /app/frontend/public ./public
    
    EXPOSE 3002
    
    HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
      CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"
    
    CMD ["node", "server.js"]