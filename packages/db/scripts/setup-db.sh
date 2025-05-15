#!/bin/bash

# Set up the PostgreSQL database for Comp AI project
#
# This script will:
# 1. Install the PostgreSQL client if needed
# 2. Start the PostgreSQL container
# 3. Create the custom SQL function needed for ID generation
# 4. Push the database schema
# 5. Seed the database if needed

echo "Setting up database for Comp AI..."

# Install psql if not already installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL client not found, installing..."
    if ! sudo apt-get update; then  
        echo "Error: Failed to update package list. Please check your network connection or package manager configuration."  
        exit 1  
    fi  
    if ! sudo apt-get install -y postgresql-client; then  
        echo "Error: Failed to install PostgreSQL client. Please check your permissions or package manager configuration."  
        exit 1  
    fi
fi

# Start the database container
echo "Starting PostgreSQL container..."
cd /workspaces/comp/packages/db
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check if the container is running
CONTAINER_NAME=$(docker ps | grep postgres | awk '{print $NF}')
if [ -z "$CONTAINER_NAME" ]; then
    echo "Error: PostgreSQL container is not running."
    exit 1
fi

echo "PostgreSQL container is running as: $CONTAINER_NAME"

# Apply the SQL function
echo "Creating custom SQL function..."
psql "postgresql://postgres:postgres@localhost:5432/comp" -f /workspaces/comp/packages/db/prisma/functionDefinition.sql

# Check if the function was created successfully
if [ $? -ne 0 ]; then
    echo "Error: Failed to create the SQL function."
    echo "Checking if the database exists..."
    
    # Check if the database exists
    if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw comp; then
        echo "Database 'comp' doesn't exist. Creating it..."
        psql -h localhost -U postgres -c "CREATE DATABASE comp;"
        
        # Try creating the function again
        echo "Retrying to create custom SQL function..."
        psql "postgresql://postgres:postgres@localhost:5432/comp" -f /workspaces/comp/packages/db/prisma/functionDefinition.sql
    fi
fi

echo "Database setup complete. The SQL function is now installed."
echo ""
echo "You can now run 'bun db:push' to push your schema to the database."

exit 0
