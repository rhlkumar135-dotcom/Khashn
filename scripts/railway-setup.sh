#!/bin/bash
# Railway startup: generate prisma client, push schema, seed, start server
set -e

echo "=== sqrtLab Railway Startup ==="

echo "Step 1: Generating Prisma client..."
bun x prisma generate

echo "Step 2: Running Shogo SDK generate..."
bun run generate || echo "Shogo generate completed with warnings"

echo "Step 3: Pushing schema to database..."
bun x prisma db push 2>&1 || echo "Schema push done (with warnings)"

echo "Step 4: Seeding database..."
bun run scripts/seed-pg.ts 2>&1 || echo "Seed completed (data may already exist)"

echo "Step 5: Starting server on port ${PORT:-8080}..."
exec bun run server.tsx
