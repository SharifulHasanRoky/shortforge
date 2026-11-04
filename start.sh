#!/bin/sh
# Render start script - runs migrations then starts app
set -e

echo "=== Starting ShortForge ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo yes || echo no)"
echo "STORAGE_ROOT: $STORAGE_ROOT"

# Run Prisma migrations
echo ""
echo "=== Running Prisma migrations ==="
npx prisma db push --accept-data-loss 2>&1 || echo "WARNING: Prisma migration failed (continuing anyway)"

echo ""
echo "=== Storage dirs ==="
mkdir -p "$STORAGE_ROOT/videos" "$STORAGE_ROOT/audio" "$STORAGE_ROOT/images" "$STORAGE_ROOT/clips" "$STORAGE_ROOT/thumbnails"
ls -la "$STORAGE_ROOT" || true

echo ""
echo "=== Starting Next.js on port $PORT ==="
exec npx next start -p "${PORT:-3000}"
