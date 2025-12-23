# Stage 1: Build
FROM rust:1.87 AS builder

WORKDIR /app
COPY . .
RUN cargo build --release

# Stage 2: Runtime
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/Otaniemipeli /usr/local/bin/app

CMD ["app"]
