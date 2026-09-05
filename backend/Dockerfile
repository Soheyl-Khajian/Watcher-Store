# backend/Dockerfile
# Image used by .devcontainer/docker-compose.yml service "app".
# VS Code attaches here;
#
# Rules:
# - corepack enable writes to /usr/bin; that RUN must be root.
# - Uninstall the image's global pnpm. It is often newer than Node 20
#   and shadows Corepack on PATH (/usr/local/share/npm-global).
# - COREPACK_HOME must be a fixed, node-owned path baked into the image.
#   Otherwise the node user has an empty corepack cache and re-downloads the
#   pnpm tarball on every container rebuild.
# - Every named-volume mount point must exist here and be owned by node.
# - Final USER must be node (remoteUser + compose user).
# - Do not npm install -g pnpm or corepack prepare in postCreate.

FROM mcr.microsoft.com/devcontainers/typescript-node:20-bookworm

USER root

# Drop the preinstalled global pnpm so it cannot shadow Corepack.
RUN npm uninstall -g pnpm || true

# Bake pnpm into a shared corepack cache the node user can read and write.
ENV COREPACK_HOME=/opt/corepack
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN mkdir -p "$COREPACK_HOME" \
 && corepack enable \
 && corepack prepare pnpm@9.15.9 --activate \
 && chown -R node:node "$COREPACK_HOME"

# Pin the pnpm store to the path mounted as the watcher-pnpm-store volume.
# pnpm appends /v3, so the volume captures the whole content-addressable store.
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV NPM_CONFIG_STORE_DIR=/home/node/.local/share/pnpm/store
ENV PATH="${PNPM_HOME}:${PATH}"

# Pre-create and own every volume mount point.
RUN mkdir -p /home/node/.vscode-server \
      /home/node/.local/share/pnpm/store \
      /home/node/.cache \
      /workspace/node_modules \
      /workspace/frontend/.next \
      /workspace/backend/payload-cms/.next \
 && chown -R node:node /home/node /workspace

USER node
