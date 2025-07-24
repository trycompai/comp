#!/bin/bash
# Deploy script for applications and database migrations
# This script handles:
# 1. Running database migrations (via CodeBuild)
# 2. Building and deploying applications (via CodeBuild)
#
# Infrastructure updates should be done separately with 'pulumi up'

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME=${PROJECT_NAME:-comp}  # Base project name, can be overridden
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

# Parse command line arguments
DEPLOY_APP=true
DEPLOY_PORTAL=true
SKIP_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --app-only)
            DEPLOY_PORTAL=false
            shift
            ;;
        --portal-only)
            DEPLOY_APP=false
            shift
            ;;
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --app-only         Deploy only the main app"
            echo "  --portal-only      Deploy only the portal"
            echo "  --skip-migrations  Skip database migrations (DANGEROUS!)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

# Get the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Determine if we're in the infra directory or project root
if [[ "$SCRIPT_DIR" == *"/apps/infra" ]]; then
    # Script is in apps/infra, so we're likely in the right place
    INFRA_DIR="$SCRIPT_DIR"
    PROJECT_ROOT="$SCRIPT_DIR/../.."
else
    # Assume we're in project root
    INFRA_DIR="./apps/infra"
    PROJECT_ROOT="."
fi

# Get the current Pulumi stack name to determine environment
cd "$INFRA_DIR"
STACK_NAME=$(pulumi stack --show-name 2>/dev/null || true)
cd "$PROJECT_ROOT"

# Validate stack name
if [ -z "$STACK_NAME" ]; then
    echo -e "${RED}❌ No Pulumi stack selected. Please run 'pulumi stack select' first.${NC}"
    exit 1
fi

# Extract the environment suffix (e.g., "mariano-test" from "compai/mariano-test")
ENV_NAME=$(echo "$STACK_NAME" | cut -d'/' -f2)

# Validate environment name
if [ -z "$ENV_NAME" ]; then
    echo -e "${RED}❌ Could not determine environment name from stack: $STACK_NAME${NC}"
    exit 1
fi

# Construct resource names based on environment
PROJECT_PREFIX="${PROJECT_NAME}-${ENV_NAME}"
APP_PROJECT="${PROJECT_PREFIX}-app-build"
PORTAL_PROJECT="${PROJECT_PREFIX}-portal-build"
MIGRATION_PROJECT="${PROJECT_PREFIX}-migrations"

echo -e "${GREEN}🚀 Starting deployment for environment: ${ENV_NAME}${NC}"
echo -e "${YELLOW}📋 Using resource prefix: ${PROJECT_PREFIX}${NC}"
echo -e "${YELLOW}📋 Migration Project: ${MIGRATION_PROJECT}${NC}"
echo -e "${YELLOW}📋 App CodeBuild Project: ${APP_PROJECT}${NC}"
echo -e "${YELLOW}📋 Portal CodeBuild Project: ${PORTAL_PROJECT}${NC}"
echo -e "${YELLOW}📋 AWS Region: ${AWS_REGION}${NC}"

# Function to generate CodeBuild console URL
get_codebuild_url() {
    local build_id=$1
    # Extract project name from build ID (format: project-name:build-uuid)
    local project_name=$(echo "$build_id" | cut -d':' -f1)
    # URL encode the build ID (replace : with %3A)
    local encoded_build_id=$(echo "$build_id" | sed 's/:/%3A/g')
    echo "https://${AWS_REGION}.console.aws.amazon.com/codesuite/codebuild/${AWS_ACCOUNT_ID}/projects/${project_name}/build/${encoded_build_id}/?region=${AWS_REGION}"
}

# Function to wait for CodeBuild
wait_for_build() {
    local build_id=$1
    local project_name=$2
    
    echo -e "${YELLOW}⏳ Waiting for $project_name build to complete...${NC}"
    
    while true; do
        status=$(aws codebuild batch-get-builds --ids "$build_id" --query 'builds[0].buildStatus' --output text)
        
        case $status in
            "SUCCEEDED")
                echo -e "${GREEN}✅ $project_name build completed successfully${NC}"
                return 0
                ;;
            "FAILED"|"FAULT"|"STOPPED"|"TIMED_OUT")
                echo -e "${RED}❌ $project_name build failed with status: $status${NC}"
                return 1
                ;;
            "IN_PROGRESS")
                echo "  Still building..."
                sleep 30
                ;;
            *)
                echo "  Status: $status"
                sleep 30
                ;;
        esac
    done
}

# Step 1: Run Database Migrations (MUST complete before apps)
if [ "$SKIP_MIGRATIONS" = false ]; then
    echo -e "${YELLOW}🗃️  Step 1: Running database migrations...${NC}"
    migration_build_id=$(aws codebuild start-build \
        --project-name "$MIGRATION_PROJECT" \
        --query 'build.id' --output text)

    echo "Migration build ID: $migration_build_id"
    migration_url=$(get_codebuild_url "$migration_build_id")
    echo -e "${YELLOW}🔗 View build: ${migration_url}${NC}"
    if ! wait_for_build "$migration_build_id" "Database Migrations"; then
        echo -e "${RED}❌ Migration failed. Aborting deployment.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Step 1: Skipping database migrations (DANGEROUS!)${NC}"
fi

# Step 2: Build and Deploy Applications (in parallel)
echo -e "${YELLOW}🔨 Step 2: Building and deploying applications...${NC}"

# Display what will be deployed
echo -e "${YELLOW}📦 Applications to deploy:${NC}"
if [ "$DEPLOY_APP" = true ]; then
    echo -e "  - Main App ✓"
else
    echo -e "  - Main App ✗ (skipped)"
fi
if [ "$DEPLOY_PORTAL" = true ]; then
    echo -e "  - Portal ✓"
else
    echo -e "  - Portal ✗ (skipped)"
fi
echo ""

# Start app build
if [ "$DEPLOY_APP" = true ]; then
    echo -e "${YELLOW}🔨 Starting app build...${NC}"
    if aws codebuild batch-get-projects --names "$APP_PROJECT" --query 'projects[0].name' --output text &>/dev/null; then
        app_build_id=$(aws codebuild start-build \
            --project-name "$APP_PROJECT" \
            --query 'build.id' --output text)
        echo "App build ID: $app_build_id"
        app_url=$(get_codebuild_url "$app_build_id")
        echo -e "${YELLOW}🔗 View app build: ${app_url}${NC}"
    else
        echo -e "${RED}❌ App CodeBuild project '$APP_PROJECT' does not exist${NC}"
        exit 1
    fi
fi

# Start portal build
portal_build_id=""
if [ "$DEPLOY_PORTAL" = true ]; then
    echo -e "${YELLOW}🔨 Starting portal build...${NC}"
    if aws codebuild batch-get-projects --names "$PORTAL_PROJECT" --query 'projects[0].name' --output text &>/dev/null; then
        portal_build_id=$(aws codebuild start-build \
            --project-name "$PORTAL_PROJECT" \
            --query 'build.id' --output text)
        echo "Portal build ID: $portal_build_id"
        portal_url=$(get_codebuild_url "$portal_build_id")
        echo -e "${YELLOW}🔗 View portal build: ${portal_url}${NC}"
    else
        echo -e "${RED}❌ Portal CodeBuild project '$PORTAL_PROJECT' does not exist${NC}"
        echo -e "${YELLOW}💡 You may need to update your Pulumi configuration to include the portal app${NC}"
        exit 1
    fi
fi

# Display summary of running builds
echo ""
echo -e "${GREEN}📊 Build Summary:${NC}"
if [ "$DEPLOY_APP" = true ] && [ -n "$app_build_id" ]; then
    echo -e "${YELLOW}  🔨 App Build:${NC}"
    echo -e "     ID: $app_build_id"
    echo -e "     🔗 ${app_url}"
fi
if [ "$DEPLOY_PORTAL" = true ] && [ -n "$portal_build_id" ]; then
    echo -e "${YELLOW}  🔨 Portal Build:${NC}"
    echo -e "     ID: $portal_build_id"
    echo -e "     🔗 ${portal_url}"
fi
echo ""

# Wait for builds to complete
build_failed=false
if [ "$DEPLOY_APP" = true ] && [ -n "$app_build_id" ]; then
    if ! wait_for_build "$app_build_id" "Application"; then
        build_failed=true
    fi
fi

if [ "$DEPLOY_PORTAL" = true ] && [ -n "$portal_build_id" ]; then
    if ! wait_for_build "$portal_build_id" "Portal"; then
        build_failed=true
    fi
fi

if [ "$build_failed" = true ]; then
    echo -e "${RED}❌ One or more builds failed. Deployment incomplete.${NC}"
    exit 1
fi

# Get individual ALB URLs for each app from applicationOutputs
app_url=""
portal_url=""

if [ "$DEPLOY_APP" = true ]; then
    app_url=$(cd "$INFRA_DIR" && pulumi stack output applicationOutputs --json 2>/dev/null | jq -r '.app.url // ""' || echo "")
fi

if [ "$DEPLOY_PORTAL" = true ]; then
    portal_url=$(cd "$INFRA_DIR" && pulumi stack output applicationOutputs --json 2>/dev/null | jq -r '.portal.url // ""' || echo "")
fi

echo -e "${GREEN}🎉 Build and deployment completed successfully!${NC}"

if [ "$DEPLOY_APP" = true ] && [ -n "$app_url" ]; then
    echo -e "${GREEN}🌐 Application URL: $app_url${NC}"
fi

if [ "$DEPLOY_PORTAL" = true ] && [ -n "$portal_url" ]; then
    echo -e "${GREEN}🏛️  Portal URL: $portal_url${NC}"
fi

if [ -z "$app_url" ] && [ -z "$portal_url" ]; then
    echo -e "${YELLOW}ℹ️  Check Pulumi outputs for application URLs${NC}"
fi 