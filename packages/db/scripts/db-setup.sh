#!/bin/bash

# Ensure the postgres container is running
echo "Starting PostgreSQL container..."
cd "$(dirname "$0")/.."
bun docker:up

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Apply the SQL function
echo "Creating custom SQL function..."
cd "$(dirname "$0")/.."
psql "postgresql://postgres:postgres@localhost:5432/comp" -f ./prisma/functionDefinition.sql

# Generate Prisma client
echo "Generating Prisma client..."
cd "$(dirname "$0")/.."
bun db:generate

# Push the schema
echo "Pushing database schema..."
cd "$(dirname "$0")/.."
bun db:push

echo "Database setup complete."
