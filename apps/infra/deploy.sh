#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME=${PROJECT_NAME:-comp}  # Base project name, can be overridden

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
echo -e "${YELLOW}📋 CodeBuild Project: ${APP_PROJECT}${NC}"
echo -e "${YELLOW}📋 AWS Region: ${AWS_REGION}${NC}"

# Confirm deployment
echo -e "${YELLOW}⚠️  This will deploy to the '${ENV_NAME}' environment. Continue? (y/N)${NC}"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 1
fi

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

# Step 1: Update Infrastructure
echo -e "${YELLOW}📋 Step 1: Updating infrastructure...${NC}"
cd "$INFRA_DIR"
export NODE_ENV=production
if ! pulumi up --yes; then
    echo -e "${RED}❌ Pulumi update failed. Aborting deployment.${NC}"
    exit 1
fi
cd "$PROJECT_ROOT"
echo -e "${GREEN}✅ Infrastructure updated successfully${NC}"

# Add a small delay to ensure propagation
echo -e "${YELLOW}⏳ Waiting 15 seconds for infrastructure changes to propagate...${NC}"
sleep 15

# Step 2: Build and Deploy Application (includes migrations)
echo -e "${YELLOW}🔨 Step 2: Building application (migrations + Next.js + Docker)...${NC}"
app_build_id=$(aws codebuild start-build \
    --project-name "$APP_PROJECT" \
    --query 'build.id' --output text)

echo "App build ID: $app_build_id"
wait_for_build "$app_build_id" "Application"

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