#!/bin/bash
# Railway startup script — switches provider, pushes schema, seeds database
set -ex

echo "=== sqftLab Railway Setup ==="

if [ -n "$DATABASE_URL" ]; then
  echo "PostgreSQL detected — updating schema provider..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "Regenerating Prisma client for PostgreSQL..."
  rm -rf src/generated/prisma
  bun x prisma generate
fi

echo "Pushing schema to database..."
bun x prisma db push --accept-data-loss 2>&1 || echo "Schema push completed with warnings"

echo "Seeding database..."
bun run scripts/seed-pg.ts 2>&1 || echo "Seed skipped (data may already exist)"

echo "Starting server..."
bun run server.tsx
