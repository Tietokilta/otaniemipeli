# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Otaniemipeli is a web app for following and managing the Finnish student drinking game "Otaniemipeli". It consists of a Rust backend and Next.js frontend in a pnpm monorepo.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start backend (database + Rust server via Docker)
docker compose up --build

# Start frontend dev server (run in separate terminal)
pnpm dev

# Type generation (must run when changing Rust types)
pnpm generate:types

# Linting and formatting
pnpm lint           # ESLint check
pnpm lint:fix       # ESLint fix
pnpm format         # Prettier + cargo fmt

# Type checking
pnpm typecheck    # TypeScript + generated types validation

# Build
# Note: Claude should almost never run production builds since it's very slow
pnpm build:frontend                                    # Next.js
pnpm build:backend                                     # Rust (cargo)
docker compose -f docker-compose-prod.yml up --build   # Production
```

## Architecture

### Monorepo Structure
- `packages/backend/` - Rust backend (Axum + socketioxide)
- `packages/frontend/` - Next.js 16 + React 19 + TailwindCSS

### Backend (`packages/backend/`)
- **Framework**: Axum with async Rust
- **Real-time**: socketioxide for WebSocket with namespaces `/referee` and `/secretary`
- **Database**: PostgreSQL via deadpool-postgres
- **Migrations**: Flyway (in `migrations/`)
- **API routes**: `/login`, `/api/v1/{boards,drinks,games,game_data,ingredients}`

### Frontend (`packages/frontend/`)
- **App Router** pages in `src/app/(pages)/`: admin, follow, ie, referee, secretary
- **Real-time**: socket.io-client for WebSocket connections
- **Styling**: TailwindCSS

### Type System
Types flow from Rust to TypeScript via Python scripts:
1. Define types in Rust backend
2. Run `pnpm generate:types`
3. TypeScript types auto-generated to `packages/frontend/src/types/global-rust-types.d.ts`

The generated types are globally available (no imports needed).

## Code Style

- Rust: `cargo fmt` for formatting, `clippy` for linting
- TypeScript: Prettier for formatting, ESLint for linting (with `eslint --fix` for auto-fixing)
- Always include brief doc comments for each function and struct on the module root. Callbacks and inner functions can omit comments if obvious.
- Use a blank line between functions and struct definitions for readability. When modifying code, insert these where missing, but don't touch unrelated code.

## Environment Setup

Both `packages/backend/` and `packages/frontend/` require `.env` files (copy from `.sample.env`). The backend needs:
- PostgreSQL credentials
- 32-character password salt (generate with `openssl rand -hex 32`)
- Port configuration
