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

2. Go to the backend directory
   `cd packages/backend`  
    i. run `cp .sample.env .env`.  
   ii. Generate a 32-character salt for password hashing with for example

```
openssl rand -hex 32
```

iii. Fill in the wanted DB credentials and use the same ones for the flyway credentials.

3. Go to the frontend directory
   `cd ../frontend`
4. run `cp .sample.env .env`.
5. Fill in the wanted urls and ports.
6. Go back to the root directory
7. Run ´cp .sample.env .env´
8. Fill in the wanted ports with the same ones you chose for front- and backends.
9. Run `pnpm install` in the root directory to install dependencies.
10. Run `docker-compose up --build` to start the backend.
11. Run `pnpm dev` to start the frontend.

For Production build docker image run

```bash
docker-compose -f docker-compose-prod.yml up --build
```

## Usage

Then go to the frontend url and create the initial admin user.
The app should now be up and running and can be used for the game.

## Development

The types are to be generated from the backend to the frontend.
to do this run `pnpm typegen` in the root directory.
