# ============================================================
# Dockerfile - Multi-stage build for TrustNaija
# ============================================================

# Stage 1: Builder
FROM rust:1.82-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies separately from source code
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -f target/release/deps/trustnaija*

# Copy full source and build
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

# Stage 2: Runtime (minimal image)
FROM debian:bookworm-slim AS runtime

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash trustnaija

WORKDIR /app
COPY --from=builder /app/target/release/trustnaija ./trustnaija
COPY --from=builder /app/migrations ./migrations

USER trustnaija

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["./trustnaija"]
