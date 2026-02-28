# Otaniemipeli app

This is an app for following as well as managing a game of Otaniemipeli.
More information can be found from [here](https://www.tietokilta.fi/fi/kilta/otaniemipeli)

## Dependencies

- Python
- Docker
- Node.js
- pnpm

## Setup

1. Clone the repository

```
git clone git@github.com:Tietokilta/otaniemipeli
```

2. Copy the sample environment file and fill it in:

```bash
cp .sample.env .env
```

   - Generate a salt for password hashing: `openssl rand -hex 32`
   - Fill in the Postgres credentials (and mirror them for Flyway)
   - The frontend and backend URLs/ports have sensible defaults

3. Run `pnpm install` in the root directory to install dependencies.
4. Run `docker compose up --build` to start the backend.
5. Run `pnpm dev` to start the frontend.

For Production build docker image which contains front and backends run

```bash
docker-compose -f docker-compose-prod.yml up --build
```

## Running without docker compose

If you run postgres on your host machine already

Migrate:

```bash
cd packages/backend
docker run \
   --rm \
   --env-file ../../.env \
   --network host \
   -v ./migrations:/flyway/sql \
   flyway/flyway \
   -connectRetries=60 \
   -baselineOnMigrate=true \
   migrate
```

## Usage

Then go to the frontend url and create the initial admin user.
The app should now be up and running and can be used for the game.

## Development

The types are to be generated from the backend to the frontend.
to do this run `pnpm typegen` in the root directory.
