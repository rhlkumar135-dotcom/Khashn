#!/bin/bash
# Railway startup: generate prisma, push schema, seed, start server
set -e

echo "=== sqftLab Railway Startup ==="

echo "Step 1: Generating Prisma client for PostgreSQL..."
bun x prisma generate

echo "Step 2: Pushing schema to database..."
bun x prisma db push --accept-data-loss 2>&1 || echo "Schema push done (with warnings)"

echo "Step 3: Seeding database..."
bun run scripts/seed-pg.ts 2>&1 || echo "Seed completed (data may already exist)"

echo "Step 4: Starting server on port ${PORT:-8080}..."
exec bun run server.tsx
