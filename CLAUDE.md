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

## Code Style

- Rust: `cargo fmt` for formatting, `clippy` for linting
- TypeScript: Prettier for formatting, ESLint for linting (with `eslint --fix` for auto-fixing)
- Always include brief doc comments for each function and struct on the module root. Callbacks and inner functions can omit comments if obvious.
- Use a blank line between functions and struct definitions for readability. When modifying code, insert these where missing, but don't touch unrelated code.

## Developing

- Always format and lint when finished with a change, but avoid doing it unnecessarily.
- Generate types after changing Rust types before making any frontend changes.
- Make sure to update CLAUDE.md if you change core logic, data structures, or development commands.

## Environment Setup

Both `packages/backend/` and `packages/frontend/` require `.env` files (copy from `.sample.env`). The backend needs:
- PostgreSQL credentials
- 32-character password salt (generate with `openssl rand -hex 32`)
- Port configuration

## Architecture

### Monorepo Structure
- `packages/backend/` - Rust backend (Axum + socketioxide)
- `packages/frontend/` - Next.js 16 + React 19 + TailwindCSS

### Backend (`packages/backend/`)
- **Framework**: Axum with async Rust
- **Real-time**: socketioxide for WebSocket with namespace `/referee`
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

## Core Data Types & Game Logic

### Entity Hierarchy

```
Game (game session)
├── Board (physical game board)
│   └── BoardPlace[] (places on this board)
│       ├── Place (reusable place definition)
│       ├── Connection[] (paths to other places)
│       └── PlaceDrink[] (drinks awarded at this place)
└── Team[] (teams in this game)
    └── Turn[] (turns taken by this team)
        ├── TurnDrink[] (drinks awarded in this turn)
        └── BoardPlace (where the turn ended)

Drink (beverage recipe)
└── Ingredient[] (components with quantities)
```

### Key Types

**User** (`User`)
- Hierarchical permissions: Admin > Referee > IE > Secretary

**Game** (`Game`)
- Represents a game session on a specific board
- Fields: `id`, `name`, `board`, `started`, `finished`, `start_time`
- A game has many teams and uses one board

**Board** (`Board`, `BoardPlace`, `BoardPlaces`)
- A physical game board with numbered places
- `Board`: Basic board info (id, name)
- `BoardPlace`: A place at a specific `place_number` on the board, includes:
  - Reference to a reusable `Place` definition
  - Position data (`x`, `y`, `area`, `start`, `end`)
  - `connections`: Paths to adjacent places
  - `drinks`: Drinks awarded when landing here
- `Place`: Reusable place definition (`name`, `rule`, `type`, `special`)
- Movement and board locations use `place_number` (position on board), not `place_id` (ID of reusable definition)

**Team** (`Team`)
- A team participating in a game
- Fields: `team_id`, `game_id`, `team_name`, `team_hash`, `double_tampere`, `moral_victory_eligible`
- Has many turns (chronological history)

**Turn** (`Turn`)
- Represents one turn (dice throw + drinks) or a penalty turn
- Lifecycle timestamps: `start_time` → `thrown_at` → `confirmed_at` → `mixing_at` → `mixed_at` → `delivered_at` → `end_time`
- Fields:
  - `dice1`, `dice2`: Dice values (1-6, null or zero if not thrown yet)
  - `dice3`, `dice4`: Dice for special place effects (e.g., AYY backwards movement, Norske Kimble)
  - `location`: The `place_number` where the turn ended (not a PlaceId)
  - `place`: Full `BoardPlace` object for the location
  - `drinks`: List of drinks awarded
  - `penalty`: Whether this is a penalty turn (no dice)

**Drink** (`Drink`, `DrinkIngredients`, `Ingredient`)
- Beverage recipe system
- `Drink`: Basic drink info
  - `id`, `name`: Identity
  - `favorite`: Marks frequently used drinks
  - `no_mix_required`: If true, skip mixing phase (e.g., beer, premade drinks)
- `DrinkIngredients`: Drink with full ingredient list, calculated ABV and total quantity
- `Ingredient`: Component of drinks (name, abv, carbonated, quantity in cl)

**PlaceDrink** (`PlaceDrink`, `PlaceDrinks`)
- Template defining which drinks are awarded when landing on a specific `BoardPlace`
- Fields:
  - `drink`: The drink recipe to award
  - `n`: Base quantity of this drink
  - `refill`: If true, awarded on every visit; if false, only on first visit to this place
  - `optional`: If true, referee can choose whether to award this drink
  - `on_table`: If true, drink is already on the game board (immediately available); if false, needs to be ordered/mixed
- Converted to `TurnDrink` when a turn is confirmed (via `to_turn_drink()` method)

**TurnDrink** (`TurnDrink`, `TurnDrinks`)
- Actual drinks awarded to a team during a specific turn
- `TurnDrinks` is a wrapper containing `Vec<TurnDrink>`
- Fields:
  - `drink`: Reference to the drink recipe
  - `n`: Final quantity (after applying multipliers from double_tampere, dice formulas, etc.)
  - `on_table`: How many of the drinks were already on the game board (based on `PlaceDrink.on_table`)
- Can be modified by referee after turn confirmation (adding/removing drinks, changing quantities)
- Created from `PlaceDrink` templates when turn is confirmed, or manually specified for penalty turns

**Connections** (`Connection`, `Connections`)
- Defines paths between places on a board for movement calculation
- `Connection` fields: `origin`, `target` (both are `place_number` values, not place IDs)
- `Connections` holds `forwards` and `backwards` lists for each place
  - A DB row `(origin, target)` appears as a forward connection for origin and a backward connection (with swapped origin/target) for target
- Movement flags:
  - `on_land`:
    - Auto-taken when landing on origin (used for Tampere, Raide-Jokeri shortcuts)
    - Ends turn if no other forward connections available (returning from Tampere)
    - Never traversed backwards
  - `dashed`: Visual style hint for rendering the board

### Game Start Logic
- Create game → Add teams → Start game
- Starting game creates initial penalty turns for all teams at the start position
- Each penalty turn includes the starting drinks (specified in `FirstTurnPost`)

### Turn Progression
Most game logic is in `packages/backend/src/api/v1/turns/utils.rs`:

1. Start turn (referee clicks "give turn")
2. Throw dice (sets `thrown_at`)
  - Movement calculated
3. Confirm location & drinks (sets `confirmed_at`)
  - Referee can adjust dice, location is recalculated and drinks regenerated
  - Referee can adjust drinks before confirming
4. Mix drinks (IE: `mixing_at` → `mixed_at`)
5. Deliver drinks (sets `delivered_at`)
6. End turn (players raise hands, sets `end_time`)

### Movement Calculation
All movement logic is in `packages/backend/src/database/boards.rs`:

- `move_forwards()` / `move_backwards()` traverse `Connection` paths
- If turn lands on `on_land` connection, it is auto-taken
- `special` movement rules followed
- Final `place_number` is stored in `Turn.location`

### Drink Flow (PlaceDrink → TurnDrink)
- **After Throw:** `PlaceDrink` templates are converted to `TurnDrink` instances
  - Applies `special` formula (e.g., calculates quantity from dice)
  - Applies `refill` rule (skip if place visited before and refill=false)
  - Applies multipliers (double dice and `double_tampere` double quantities)
- **At Confirmation**:
  - Referee can adjust drinks (add/remove/quantity) before confirming
  - `on_table=true`: Drink already exists on board, skip mixing and delivery → goes directly to delivered
  - `no_mix_required=true`: No mixing needed (e.g., beer), skip mixing → goes directly to delivery phase
  - Drinks where `no_mix_required=false` AND `on_table=false` are sent to IE for mixing
- **Mixing & Delivery**:
  - IE mixes the drink (`mixing_at` → `mixed_at` → `delivered_at`)
- **End Turn**: Players raise hands when drinks consumed and turn is complete
