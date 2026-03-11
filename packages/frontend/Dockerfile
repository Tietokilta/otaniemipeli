FROM node:24-trixie-slim AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Copy workspace config files from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy frontend package.json for dependency resolution
COPY packages/frontend/package.json packages/frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source files
COPY packages/frontend/ packages/frontend/

# Set build args (NEXT_PUBLIC_* are baked into the JS bundle at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# # Build from frontend directory
WORKDIR /app/packages/frontend

# Rebuild native modules for container architecture (lightningcss, etc.)
RUN pnpm rebuild

RUN pnpm build

# ---- runtime stage ----
FROM node:24-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy the entire standalone output (node_modules + packages/frontend) to /app
COPY --from=builder /app/packages/frontend/.next/standalone /app/

# Copy, in one command:
# - static assets to /app/packages/frontend/.next/static
# - public folder to /app/packages/frontend/public
# - the entry point script to /app/packages/frontend/entrypoint.sh
COPY --from=builder --parents \
    /app/packages/frontend/./.next/static \
    /app/packages/frontend/./public \
    /app/packages/frontend/./entrypoint.sh \
    ./packages/frontend/

RUN chown node:node ./packages/frontend/public/__env.js

USER node
WORKDIR /app/packages/frontend
CMD ["sh", "./entrypoint.sh"]
