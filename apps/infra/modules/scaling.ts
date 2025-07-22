import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { CommonConfig, ContainerOutputs, LoadBalancerOutputs } from '../types';

export function createScaling(
  config: CommonConfig,
  container: ContainerOutputs,
  loadBalancer: LoadBalancerOutputs,
) {
  const { commonTags } = config;

  // Auto Scaling Target for ECS Service
  const ecsTarget = new aws.appautoscaling.Target(`${config.projectName}-ecs-target`, {
    maxCapacity: 10,
    minCapacity: 2,
    resourceId: pulumi.interpolate`service/${container.clusterName}/${container.serviceName}`,
    scalableDimension: 'ecs:service:DesiredCount',
    serviceNamespace: 'ecs',
    tags: {
      ...commonTags,
      Name: `${config.projectName}-ecs-target`,
      Type: 'autoscaling-target',
    },
  });

  // CPU-based Auto Scaling Policy
  const cpuScalingPolicy = new aws.appautoscaling.Policy(`${config.projectName}-cpu-scaling`, {
    name: `${config.projectName}-cpu-scaling`,
    policyType: 'TargetTrackingScaling',
    resourceId: ecsTarget.resourceId,
    scalableDimension: ecsTarget.scalableDimension,
    serviceNamespace: ecsTarget.serviceNamespace,
    targetTrackingScalingPolicyConfiguration: {
      targetValue: 70.0, // Target 70% CPU utilization
      predefinedMetricSpecification: {
        predefinedMetricType: 'ECSServiceAverageCPUUtilization',
      },
      scaleOutCooldown: 300, // 5 minutes
      scaleInCooldown: 300, // 5 minutes
    },
  });

  // Memory-based Auto Scaling Policy
  const memoryScalingPolicy = new aws.appautoscaling.Policy(
    `${config.projectName}-memory-scaling`,
    {
      name: `${config.projectName}-memory-scaling`,
      policyType: 'TargetTrackingScaling',
      resourceId: ecsTarget.resourceId,
      scalableDimension: ecsTarget.scalableDimension,
      serviceNamespace: ecsTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: {
        targetValue: 80.0, // Target 80% memory utilization
        predefinedMetricSpecification: {
          predefinedMetricType: 'ECSServiceAverageMemoryUtilization',
        },
        scaleOutCooldown: 300,
        scaleInCooldown: 600, // Longer cooldown for memory
      },
    },
  );

  // ALB Request Count Scaling Policy
  const requestCountScalingPolicy = new aws.appautoscaling.Policy(
    `${config.projectName}-request-count-scaling`,
    {
      name: `${config.projectName}-request-count-scaling`,
      policyType: 'TargetTrackingScaling',
      resourceId: ecsTarget.resourceId,
      scalableDimension: ecsTarget.scalableDimension,
      serviceNamespace: ecsTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: {
        targetValue: 1000.0, // Target 1000 requests per target per minute
        predefinedMetricSpecification: {
          predefinedMetricType: 'ALBRequestCountPerTarget',
          resourceLabel: pulumi
            .all([loadBalancer.albArn, loadBalancer.targetGroupArn])
            .apply(([albArn, tgArn]: [string, string]) => {
              // ALB ARN: arn:aws:elasticloadbalancing:region:account:loadbalancer/app/load-balancer-name/1234567890123456
              // Target Group ARN: arn:aws:elasticloadbalancing:region:account:targetgroup/target-group-name/1234567890123456
              // Required format: app/load-balancer-name/1234567890123456/targetgroup/target-group-name/1234567890123456
              const albParts = albArn.split('/');
              const tgParts = tgArn.split('/');
              return `${albParts.slice(-3).join('/')}/targetgroup/${tgParts.slice(-2).join('/')}`;
            }),
        },
        scaleOutCooldown: 300,
        scaleInCooldown: 300,
      },
    },
  );

  // Scheduled Scaling for predictable load patterns
  const scheduledScalingUp = new aws.appautoscaling.ScheduledAction(
    `${config.projectName}-scale-up-business-hours`,
    {
      name: `${config.projectName}-scale-up-business-hours`,
      serviceNamespace: ecsTarget.serviceNamespace,
      resourceId: ecsTarget.resourceId,
      scalableDimension: ecsTarget.scalableDimension,
      schedule: 'cron(0 9 ? * MON-FRI *)', // 9 AM UTC on weekdays
      scalableTargetAction: {
        minCapacity: 3,
        maxCapacity: 10,
      },
    },
  );

  const scheduledScalingDown = new aws.appautoscaling.ScheduledAction(
    `${config.projectName}-scale-down-off-hours`,
    {
      name: `${config.projectName}-scale-down-off-hours`,
      serviceNamespace: ecsTarget.serviceNamespace,
      resourceId: ecsTarget.resourceId,
      scalableDimension: ecsTarget.scalableDimension,
      schedule: 'cron(0 18 ? * MON-FRI *)', // 6 PM UTC on weekdays
      scalableTargetAction: {
        minCapacity: 2,
        maxCapacity: 5,
      },
    },
  );

  // CloudWatch Alarms for scaling monitoring
  const scaleOutAlarm = new aws.cloudwatch.MetricAlarm(`${config.projectName}-scale-out-alarm`, {
    name: `${config.projectName}-scale-out-triggered`,
    metricName: 'CPUUtilization',
    namespace: 'AWS/ECS',
    statistic: 'Average',
    period: 300,
    evaluationPeriods: 2,
    threshold: 75,
    comparisonOperator: 'GreaterThanThreshold',
    dimensions: pulumi
      .all([container.serviceName, container.clusterName])
      .apply(([serviceName, clusterName]: [string, string]) => ({
        ServiceName: serviceName,
        ClusterName: clusterName,
      })),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-scale-out-alarm`,
      Type: 'cloudwatch-alarm',
    },
  });

  const scaleInAlarm = new aws.cloudwatch.MetricAlarm(`${config.projectName}-scale-in-alarm`, {
    name: `${config.projectName}-scale-in-triggered`,
    metricName: 'CPUUtilization',
    namespace: 'AWS/ECS',
    statistic: 'Average',
    period: 600,
    evaluationPeriods: 3,
    threshold: 25,
    comparisonOperator: 'LessThanThreshold',
    dimensions: pulumi
      .all([container.serviceName, container.clusterName])
      .apply(([serviceName, clusterName]: [string, string]) => ({
        ServiceName: serviceName,
        ClusterName: clusterName,
      })),
    tags: {
      ...commonTags,
      Name: `${config.projectName}-scale-in-alarm`,
      Type: 'cloudwatch-alarm',
    },
  });

  return {
    minCapacity: ecsTarget.minCapacity,
    maxCapacity: ecsTarget.maxCapacity,
    cpuScaleUpThreshold: 70,
    cpuScaleDownThreshold: 25,
    memoryScaleUpThreshold: 80,
  };
}
