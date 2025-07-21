# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Switch to root to adjust ownership
USER root

# Create node_modules folder with proper permissions if not exists
RUN mkdir -p /workspace/node_modules && \
    chown -R node:node /workspace

# Switch back to node user for normal operations
USER node
