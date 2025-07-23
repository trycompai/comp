#!/bin/bash
# Deploy script for applications and database migrations
# This script handles:
# 1. Running database migrations (via CodeBuild)
# 2. Building and deploying applications (via CodeBuild)
# 3. Verifying deployment success
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
CLUSTER_NAME="${PROJECT_PREFIX}"
SERVICE_NAME="${PROJECT_PREFIX}"  # Service name matches project prefix
APP_PROJECT="${PROJECT_PREFIX}-app-build"
PORTAL_PROJECT="${PROJECT_PREFIX}-portal-build"
MIGRATION_PROJECT="${PROJECT_PREFIX}-migrations"

echo -e "${GREEN}🚀 Starting deployment for environment: ${ENV_NAME}${NC}"
echo -e "${YELLOW}📋 Using resource prefix: ${PROJECT_PREFIX}${NC}"

# Try to get actual values from Pulumi outputs
ACTUAL_CLUSTER=$(cd "$INFRA_DIR" && pulumi stack output ecsClusterName 2>/dev/null || echo "")
ACTUAL_SERVICE=$(cd "$INFRA_DIR" && pulumi stack output ecsServiceName 2>/dev/null || echo "")

# Use actual values if available, otherwise use constructed names
CLUSTER_NAME=${ACTUAL_CLUSTER:-$CLUSTER_NAME}
SERVICE_NAME=${ACTUAL_SERVICE:-$SERVICE_NAME}

echo -e "${YELLOW}📋 Cluster: ${CLUSTER_NAME}${NC}"
echo -e "${YELLOW}📋 Service: ${SERVICE_NAME}${NC}"
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
    app_build_id=$(aws codebuild start-build \
        --project-name "$APP_PROJECT" \
        --query 'build.id' --output text)
    echo "App build ID: $app_build_id"
    app_url=$(get_codebuild_url "$app_build_id")
    echo -e "${YELLOW}🔗 View app build: ${app_url}${NC}"
fi

# Start portal build (if project exists)
portal_build_id=""
if [ "$DEPLOY_PORTAL" = true ] && aws codebuild describe-projects --names "$PORTAL_PROJECT" &>/dev/null; then
    portal_build_id=$(aws codebuild start-build \
        --project-name "$PORTAL_PROJECT" \
        --query 'build.id' --output text)
    echo "Portal build ID: $portal_build_id"
    portal_url=$(get_codebuild_url "$portal_build_id")
    echo -e "${YELLOW}🔗 View portal build: ${portal_url}${NC}"
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

# Step 3: Verify Deployment
echo -e "${YELLOW}🔍 Step 3: Verifying deployment...${NC}"

# Wait for ECS service to stabilize after the build updated it
echo -e "${YELLOW}⏳ Waiting for ECS deployment to stabilize...${NC}"

# Set a timeout of 10 minutes (600 seconds) for the wait
# Use a cross-platform timeout implementation
wait_with_timeout() {
    local timeout_duration=$1
    shift
    local command=("$@")
    
    # Start the command in the background
    "${command[@]}" &
    local cmd_pid=$!
    
    # Wait for either the command to complete or timeout
    local count=0
    while kill -0 "$cmd_pid" 2>/dev/null && [ $count -lt $timeout_duration ]; do
        sleep 1
        ((count++))
    done
    
    # Check if command is still running (timed out)
    if kill -0 "$cmd_pid" 2>/dev/null; then
        kill "$cmd_pid" 2>/dev/null
        wait "$cmd_pid" 2>/dev/null
        return 1  # Timeout occurred
    else
        wait "$cmd_pid"
        return $?  # Return the command's exit status
    fi
}

if ! wait_with_timeout 600 aws ecs wait services-stable \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME"; then
    
    echo -e "${RED}❌ ECS service failed to stabilize within 10 minutes${NC}"
    
    # Get the current service status for debugging
    echo -e "${RED}Current service status:${NC}"
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,status:status}' \
        --output table
    
    # Get recent events
    echo -e "${RED}Recent service events:${NC}"
    aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --query 'services[0].events[0:5]' \
        --output json
    
    # Check for failed tasks
    echo -e "${RED}Checking for task failures:${NC}"
    TASK_ARNS=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --desired-status STOPPED \
        --query 'taskArns[0:3]' \
        --output json)
    
    if [ "$TASK_ARNS" != "[]" ] && [ -n "$TASK_ARNS" ]; then
        aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks $TASK_ARNS \
            --query 'tasks[*].{taskArn:taskArn,stoppedReason:stoppedReason}' \
            --output table
    fi
    
    echo -e "${RED}❌ Deployment failed - ECS service is not stable${NC}"
    exit 1
fi

echo -e "${GREEN}✅ ECS service is stable${NC}"

# Get ALB DNS name
alb_dns=$(aws elbv2 describe-load-balancers \
    --query "LoadBalancers[?contains(LoadBalancerName, \`${PROJECT_PREFIX}-lb\`)].DNSName" \
    --output text)

# If not found via AWS CLI, try to get from Pulumi outputs
if [ -z "$alb_dns" ]; then
    echo -e "${YELLOW}⚠️  Could not find load balancer via AWS CLI, checking Pulumi outputs...${NC}"
    alb_dns=$(cd "$INFRA_DIR" && pulumi stack output albDns 2>/dev/null || echo "")
fi

if [ -z "$alb_dns" ]; then
    echo -e "${RED}❌ Could not find load balancer DNS name${NC}"
    exit 1
fi

# Health check
if curl -sf "http://$alb_dns/" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Application URL: http://$alb_dns${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
    exit 1
fi 