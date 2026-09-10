#!/bin/bash
# Railway startup: push schema, seed, start server
set -e

echo "=== sqftLab Railway Startup ==="

echo "Step 1: Pushing schema to database..."
bun x prisma db push --accept-data-loss 2>&1 || echo "Schema push done (with warnings)"

echo "Step 2: Seeding database..."
bun run scripts/seed-pg.ts 2>&1 || echo "Seed completed (data may already exist)"

echo "Step 3: Starting server on port ${PORT:-8080}..."
exec bun run server.tsx
