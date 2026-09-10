#!/bin/bash
# Railway startup script — runs migrations + seeds on PostgreSQL
set -ex

echo "=== sqftLab Railway Setup ==="

if [ -n "$DATABASE_URL" ]; then
  echo "PostgreSQL detected — updating schema provider..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "Regenerating Prisma client for PostgreSQL..."
  rm -rf src/generated/prisma
  bun x prisma generate
fi

echo "Pushing schema..."
bun x --bun prisma db push --accept-data-loss 2>/dev/null || bun x --bun prisma db push --accept-data-loss

echo "Seeding database..."
bun run scripts/seed-pg.ts

echo "=== Setup complete ==="
