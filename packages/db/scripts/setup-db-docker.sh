#!/bin/bash

# Set up the PostgreSQL database for Comp AI project using Docker
#
# This script will:
# 1. Start the PostgreSQL container
# 2. Create the custom SQL function needed for ID generation directly through Docker
# 3. Let the user know the database is ready for schema push

echo "Setting up database for Comp AI..."

# Start the database container
echo "Starting PostgreSQL container..."
cd /workspaces/comp/packages/db
docker-compose up -d

# Wait for PostgreSQL to be ready (using docker-based healthcheck)
echo "Waiting for PostgreSQL to be ready..."
CONTAINER_NAME="comp-db-postgres-1"
RETRIES=30
COUNT=0

while ! docker exec $CONTAINER_NAME pg_isready -U postgres > /dev/null 2>&1; do
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $RETRIES ]; then
        echo "Error: PostgreSQL did not become ready in time."
        exit 1
    fi
    echo "Waiting for PostgreSQL to be ready... ($COUNT/$RETRIES)"
    sleep 2
done

echo "PostgreSQL is ready!"

# Create the SQL function using docker exec
echo "Creating custom SQL function..."
docker exec -i $CONTAINER_NAME psql -U postgres -d comp -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Copy the SQL function from the file to the container and execute it
cat /workspaces/comp/packages/db/prisma/functionDefinition.sql | docker exec -i $CONTAINER_NAME psql -U postgres -d comp

# Check if the function was created successfully
if docker exec -i $CONTAINER_NAME psql -U postgres -d comp -c "SELECT 1 FROM pg_proc WHERE proname = 'generate_prefixed_cuid';" | grep -q 1; then
    echo "✅ The generate_prefixed_cuid function has been successfully created!"
else
    echo "⚠️ Warning: Could not verify if the function was created."
fi

echo ""
echo "Database setup complete. You can now run 'bun db:push' to push your schema to the database."

exit 0
