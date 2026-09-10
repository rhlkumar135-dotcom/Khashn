#!/bin/bash
# Railway startup script — runs migrations + seeds on PostgreSQL
# For local dev with SQLite, this is not needed

set -e

echo "=== sqftLab Railway Setup ==="

# If DATABASE_URL is set (Railway), switch schema to PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  echo "PostgreSQL detected — updating schema provider..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
fi

# Push schema to database
echo "Pushing schema..."
bun x --bun prisma db push --skip-generate 2>/dev/null || bun x --bun prisma db push

# Seed if tables are empty
echo "Seeding database..."
bun run scripts/seed-pg.ts

echo "=== Setup complete ==="
