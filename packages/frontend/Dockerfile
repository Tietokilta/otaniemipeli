# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM node:20-bookworm AS builder
WORKDIR /app

# use pnpm via corepack (no global install mess)
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# only what is needed to install deps
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# copy source and build
COPY .. .
# make sure next.config.ts has:  export default { output: 'standalone' }
RUN pnpm build

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# bring only what the standalone server needs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# optional: keep config alongside server (not strictly required)
COPY --from=builder /app/next.config.* ./

USER node
CMD ["node", "server.js"]
