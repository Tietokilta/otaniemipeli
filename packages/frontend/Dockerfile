FROM node:20-bookworm AS builder
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

# Build from frontend directory
WORKDIR /app/packages/frontend

# Rebuild native modules for container architecture (lightningcss, etc.)
RUN pnpm rebuild

RUN pnpm build

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${PORT}

# Copy the entire standalone output (includes node_modules at root level)
COPY --from=builder /app/packages/frontend/.next/standalone ./
# Copy static assets
COPY --from=builder /app/packages/frontend/.next/static ./packages/frontend/.next/static
# Copy public folder from source
COPY --from=builder /app/packages/frontend/public ./packages/frontend/public

USER node
WORKDIR /app/packages/frontend
CMD ["node", "server.js"]
