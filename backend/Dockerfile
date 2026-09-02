# backend/Dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:20-bookworm

USER root

RUN mkdir -p /workspace/node_modules /workspace/backend/payload-cms/.next /workspace/frontend/.next && \
    chown -R node:node /workspace

USER node

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate