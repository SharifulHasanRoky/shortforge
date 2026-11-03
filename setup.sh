#!/usr/bin/env bash
# setup.sh — Run this once after cloning the repo.
# Sets up the database and verifies the project is ready to run.
set -e

echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install
elif command -v npm &> /dev/null; then
  npm install
else
  echo "❌ Neither bun nor npm found. Install one of them first."
  exit 1
fi

echo ""
echo "🗄️  Setting up SQLite database..."
if command -v bun &> /dev/null; then
  bun run db:push
else
  npm run db:push
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the dev server:"
echo "  bun run dev    # or: npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
echo "First steps in the app:"
echo "  1. Auto-Pilot tab → New Campaign (set niche + posting times)"
echo "  2. Settings tab → Connect YouTube (one-time OAuth setup)"
echo "  3. Walk away. The system handles the rest."
