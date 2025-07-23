import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig, ContainerOutputs, LoadBalancerOutputs } from '../types';

interface ApplicationScalingOutputs {
  target: aws.appautoscaling.Target;
  cpuPolicy: aws.appautoscaling.Policy;
  memoryPolicy: aws.appautoscaling.Policy;
  requestCountPolicy?: aws.appautoscaling.Policy;
}

export function createScaling(
  config: CommonConfig,
  applications: ApplicationConfig[],
  container: ContainerOutputs,
  loadBalancer: LoadBalancerOutputs,
) {
  const { commonTags } = config;

  // Create scaling resources for each application
  const applicationScaling = applications.reduce(
    (acc, app, index) => {
      const appContainer = container.applications?.[index];
      if (!appContainer) return acc;

      // Skip if app doesn't want auto-scaling
      if (app.minCount === app.maxCount) return acc;

      // Auto Scaling Target for ECS Service
      const ecsTarget = new aws.appautoscaling.Target(
        `${config.projectName}-${app.name}-ecs-target`,
        {
          maxCapacity: app.maxCount || 10,
          minCapacity: app.minCount || 1,
          resourceId: pulumi.interpolate`service/${config.projectName}-cluster/${appContainer.serviceName}`,
          scalableDimension: 'ecs:service:DesiredCount',
          serviceNamespace: 'ecs',
          tags: {
            ...commonTags,
            Name: `${config.projectName}-${app.name}-ecs-target`,
            Type: 'autoscaling-target',
            App: app.name,
          },
        },
      );

      // CPU-based Auto Scaling Policy
      const cpuScalingPolicy = new aws.appautoscaling.Policy(
        `${config.projectName}-${app.name}-cpu-scaling`,
        {
          name: `${config.projectName}-${app.name}-cpu-scaling`,
          policyType: 'TargetTrackingScaling',
          resourceId: ecsTarget.resourceId,
          scalableDimension: ecsTarget.scalableDimension,
          serviceNamespace: ecsTarget.serviceNamespace,
          targetTrackingScalingPolicyConfiguration: {
            targetValue: app.targetCPUPercent || 70.0,
            predefinedMetricSpecification: {
              predefinedMetricType: 'ECSServiceAverageCPUUtilization',
            },
            scaleOutCooldown: 300, // 5 minutes
            scaleInCooldown: 300, // 5 minutes
          },
        },
      );

      // Memory-based Auto Scaling Policy
      const memoryScalingPolicy = new aws.appautoscaling.Policy(
        `${config.projectName}-${app.name}-memory-scaling`,
        {
          name: `${config.projectName}-${app.name}-memory-scaling`,
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
            scaleInCooldown: 300,
          },
        },
      );

      // Request count based scaling (if app has a target group)
      let requestCountPolicy: aws.appautoscaling.Policy | undefined;
      if (appContainer.targetGroupArn) {
        requestCountPolicy = new aws.appautoscaling.Policy(
          `${config.projectName}-${app.name}-request-scaling`,
          {
            name: `${config.projectName}-${app.name}-request-scaling`,
            policyType: 'TargetTrackingScaling',
            resourceId: ecsTarget.resourceId,
            scalableDimension: ecsTarget.scalableDimension,
            serviceNamespace: ecsTarget.serviceNamespace,
            targetTrackingScalingPolicyConfiguration: {
              targetValue: 1000.0, // Target 1000 requests per target
              predefinedMetricSpecification: {
                predefinedMetricType: 'ALBRequestCountPerTarget',
                // More reliable approach: extract the suffix parts properly
                resourceLabel: pulumi
                  .all([loadBalancer.albArn, appContainer.targetGroupArn])
                  .apply(([albArn, tgArn]) => {
                    // ALB ARN format: arn:aws:elasticloadbalancing:region:account:loadbalancer/app/name/id
                    // TG ARN format: arn:aws:elasticloadbalancing:region:account:targetgroup/name/id
                    // Resource label format: app/name/id/targetgroup/name/id

                    const albMatch = albArn.match(/loadbalancer\/(app\/[^\/]+\/[^\/]+)$/);
                    const tgMatch = tgArn.match(/targetgroup\/([^\/]+\/[^\/]+)$/);

                    if (!albMatch || !tgMatch) {
                      throw new Error(
                        `Failed to parse ALB or Target Group ARN: ${albArn}, ${tgArn}`,
                      );
                    }

                    return `${albMatch[1]}/targetgroup/${tgMatch[1]}`;
                  }),
              },
              scaleOutCooldown: 60,
              scaleInCooldown: 180,
            },
          },
        );
      }

      acc[app.name] = {
        target: ecsTarget,
        cpuPolicy: cpuScalingPolicy,
        memoryPolicy: memoryScalingPolicy,
        requestCountPolicy,
      };

      return acc;
    },
    {} as Record<string, ApplicationScalingOutputs>,
  );

  return {
    applicationScaling,
  };
}
