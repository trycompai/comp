#!/bin/sh
set -e

echo "Starting application..."

# Check if we need to run migrations
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  cd packages/db && bunx prisma migrate deploy && cd ../..
fi

# Start the application
exec bun run apps/app/server.js