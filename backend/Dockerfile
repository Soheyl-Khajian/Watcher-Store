# backend/Dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:20

# به کاربر روت سوییچ می‌کنیم تا بتوانیم دسترسی‌ها را تغییر دهیم
USER root

# پوشه‌های لازم را ساخته و مالکیت آن‌ها را به کاربر node می‌دهیم
RUN mkdir -p /workspace/node_modules /workspace/backend/payload-cms/.next /workspace/frontend/.next && \
    chown -R node:node /workspace

# برای بقیه عملیات به کاربر عادی node برمی‌گردیم
USER node