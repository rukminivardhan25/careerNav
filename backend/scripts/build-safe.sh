#!/bin/bash
# Safe build script that doesn't fail if migrations timeout
# Migrations will be handled at runtime by initializePrisma()

set -e

echo "🔨 Starting build process..."

# Generate Prisma Client (this doesn't require DB connection)
echo "📦 Generating Prisma Client..."
npx prisma generate

# Try to run migrations, but don't fail if they timeout
# Migrations will be handled at runtime by initializePrisma() anyway
echo "🔄 Attempting to run migrations..."
if npx prisma migrate deploy; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️ Migration failed or timed out - migrations will be handled at runtime"
  echo "ℹ️ This is expected if the database is temporarily unavailable"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build completed successfully"

