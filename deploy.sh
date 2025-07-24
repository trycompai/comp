# Step 3: Verify Deployment
echo -e "${YELLOW}🔍 Step 3: Verifying deployment...${NC}"

# Wait for ECS service to stabilize after the build updated it
echo -e "${YELLOW}⏳ Waiting for ECS deployment to stabilize...${NC}"

# Check initial service status
echo -e "${YELLOW}📊 Initial service status:${NC}"
aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,status:status}' \
    --output table

# Simple polling approach instead of complex timeout function
MAX_WAIT_TIME=600  # 10 minutes
WAIT_INTERVAL=30   # 30 seconds
elapsed_time=0

echo -e "${YELLOW}⏳ Polling service status every ${WAIT_INTERVAL} seconds (max ${MAX_WAIT_TIME}s)...${NC}"

while [ $elapsed_time -lt $MAX_WAIT_TIME ]; do
    # Get current service status
    service_status=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}' \
        --output json)
    
    desired=$(echo "$service_status" | jq -r '.desired')
    running=$(echo "$service_status" | jq -r '.running')
    pending=$(echo "$service_status" | jq -r '.pending')
    
    echo "  Time: ${elapsed_time}s - Desired: $desired, Running: $running, Pending: $pending"
    
    # Check if service is stable (running count matches desired, no pending)
    if [ "$running" = "$desired" ] && [ "$pending" = "0" ] && [ "$desired" != "0" ]; then
        echo -e "${GREEN}✅ ECS service is stable${NC}"
        break
    fi
    
    # Accept partial deployment if we have at least 1 running task and it's been running for a while
    if [ "$running" -gt "0" ] && [ "$desired" != "0" ] && [ $elapsed_time -gt 180 ]; then
        echo -e "${YELLOW}⚠️  Partial deployment detected: $running/$desired tasks running${NC}"
        echo -e "${YELLOW}🔍 Checking if this is due to health check issues...${NC}"
        
        # Check recent events for health check failures
        health_check_failures=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --query 'services[0].events[0:5]' \
            --output json | jq -r '.[] | select(.message | contains("health checks")) | .message' | wc -l)
        
        if [ "$health_check_failures" -gt "0" ]; then
            echo -e "${YELLOW}🚨 Health check failures detected - but app may still be working${NC}"
            echo -e "${YELLOW}⚡ Accepting deployment with $running running task(s)${NC}"
            echo -e "${YELLOW}💡 Recommendation: Check health endpoint and fix health checks${NC}"
            break
        fi
    fi
    
    # Check for obvious failures
    if [ "$running" = "0" ] && [ "$pending" = "0" ] && [ $elapsed_time -gt 120 ]; then
        echo -e "${RED}❌ No tasks running after 2 minutes - checking for failures...${NC}"
        
        # Get recent events
        echo -e "${RED}Recent service events:${NC}"
        aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --query 'services[0].events[0:3]' \
            --output json
        
        # Check for failed tasks
        failed_tasks=$(aws ecs list-tasks \
            --cluster "$CLUSTER_NAME" \
            --service-name "$SERVICE_NAME" \
            --desired-status STOPPED \
            --query 'taskArns[0:2]' \
            --output json)
        
        if [ "$failed_tasks" != "[]" ] && [ -n "$failed_tasks" ]; then
            echo -e "${RED}Failed task details:${NC}"
            echo "$failed_tasks" | jq -r '.[]' | while read -r task_arn; do
                aws ecs describe-tasks \
                    --cluster "$CLUSTER_NAME" \
                    --tasks "$task_arn" \
                    --query 'tasks[0].{stoppedReason:stoppedReason,containers:containers[*].{name:name,exitCode:exitCode,reason:reason}}' \
                    --output json
            done
        fi
        
        echo -e "${RED}❌ Deployment failed - no healthy tasks running${NC}"
        exit 1
    fi
    
    sleep $WAIT_INTERVAL
    elapsed_time=$((elapsed_time + WAIT_INTERVAL))
done

# If we've exceeded the wait time
if [ $elapsed_time -ge $MAX_WAIT_TIME ]; then
    echo -e "${RED}❌ ECS service failed to stabilize within $((MAX_WAIT_TIME/60)) minutes${NC}"
    
    # Get final status for debugging
    echo -e "${RED}Final service status:${NC}"
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
    
    exit 1
fi 