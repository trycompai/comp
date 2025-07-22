#!/bin/bash
echo "=== Getting ECS Log Streams ==="
aws logs describe-log-streams --log-group-name "/aws/ecs/comp-mariano-test" --region us-east-1 --query 'logStreams[0:2].{name:logStreamName,time:lastEventTime}' --output table
echo ""
echo "=== Getting CodeBuild Log Streams ==="
aws logs describe-log-streams --log-group-name "/aws/codebuild/comp-mariano-test-app-build" --region us-east-1 --query 'logStreams[0:2].{name:logStreamName,time:lastEventTime}' --output table
