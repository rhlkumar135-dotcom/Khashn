#!/bin/bash
# Railway build script — swaps schema to postgresql and regenerates everything
set -e

echo "=== sqftLab Railway Build ==="

# If DATABASE_URL is set, switch schema to PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  echo "PostgreSQL detected — switching schema provider..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
  echo "Schema switched to PostgreSQL"
fi

# Install deps (skip postinstall to avoid generating with wrong provider)
echo "Installing dependencies..."
bun install --ignore-scripts

# Clean and regenerate Prisma client with correct provider
echo "Regenerating Prisma client..."
rm -rf src/generated/prisma
bun x prisma generate

# Run Shogo generate
echo "Running Shogo generate..."
bun run generate || true

# Build the frontend
echo "Building frontend..."
bun run build

echo "=== Build complete ==="
