#!/bin/bash

# E2E Test Setup Script
# This script prepares the environment for running E2E tests

set -e

echo "🧪 Setting up E2E test environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from apps/app directory${NC}"
    exit 1
fi

# 1. Check for .env.test.local
echo -e "${YELLOW}1. Checking test environment file...${NC}"
if [ ! -f ".env.test.local" ]; then
    echo "Creating .env.test.local from template..."
    cat > .env.test.local << 'EOF'
# E2E Test Environment Variables
PLAYWRIGHT_BASE_URL=http://localhost:3000
E2E_TEST_MODE=true
E2E_USE_REAL_AUTH=false
E2E_TEST_EMAIL=e2e-test@example.com
E2E_TEST_NAME=E2E Test User

# Database (adjust as needed)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/comp_e2e_test

# Required app vars
AUTH_SECRET=test-secret-for-e2e-only
RESEND_API_KEY=re_test_key
NEXT_PUBLIC_PORTAL_URL=http://localhost:3002
REVALIDATION_SECRET=test-revalidation-secret

# Test Redis
UPSTASH_REDIS_REST_URL=https://test.upstash.io
UPSTASH_REDIS_REST_TOKEN=test-token

# Google OAuth (mock values for test)
GOOGLE_ID=test-client-id
GOOGLE_SECRET=test-client-secret
EOF
    echo -e "${GREEN}✓ Created .env.test.local${NC}"
    echo -e "${YELLOW}  Please update the values as needed!${NC}"
else
    echo -e "${GREEN}✓ .env.test.local exists${NC}"
fi

# 2. Create test database
echo ""
echo -e "${YELLOW}2. Setting up test database...${NC}"

# Skip PostgreSQL check - assume it's running
echo "Assuming PostgreSQL is running..."

# Skip database creation - we'll create it with Prisma
echo "Will create database with Prisma if needed..."
echo -e "${GREEN}✓ Database check skipped${NC}"

# 3. Run migrations on test database
echo ""
echo -e "${YELLOW}3. Running migrations on test database...${NC}"
cd ../../packages/db
# Use the DATABASE_URL from .env.test.local if it exists
if [ -f "../../apps/app/.env.test.local" ]; then
    export $(grep DATABASE_URL ../../apps/app/.env.test.local | xargs)
fi
# Create database and push schema (will create DB if it doesn't exist)
bunx prisma db push --skip-generate --accept-data-loss
cd ../../apps/app
echo -e "${GREEN}✓ Migrations complete${NC}"

# 4. Install Playwright browsers if needed
echo ""
echo -e "${YELLOW}4. Checking Playwright browsers...${NC}"
if [ ! -d "$HOME/.cache/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    bunx playwright install --with-deps chromium
    echo -e "${GREEN}✓ Installed Playwright browsers${NC}"
else
    echo -e "${GREEN}✓ Playwright browsers already installed${NC}"
fi

# 5. Summary
echo ""
echo -e "${GREEN}✅ E2E test environment is ready!${NC}"
echo ""
echo "To run E2E tests:"
echo "  bun run test:e2e          # Run all tests"
echo "  bun run test:e2e:headed   # Run with browser visible"
echo "  bun run test:e2e:ui       # Open Playwright UI"
echo ""
echo "Make sure your dev server is running:"
echo "  bun run dev"
echo "" 