import * as aws from '@pulumi/aws';
import { ApplicationConfig, CommonConfig, NetworkOutputs } from '../types';

// Create individual ALB for each application
export function createApplicationLoadBalancer(
  config: CommonConfig,
  network: NetworkOutputs,
  app: ApplicationConfig,
) {
  const { commonTags } = config;
  const appName = `${config.projectName}-${app.name}`;

  // Create ALB for this specific app
  const lb = new aws.lb.LoadBalancer(`${appName}-lb`, {
    name: `${appName}-lb`.substring(0, 32), // AWS limit
    loadBalancerType: 'application',
    subnets: network.publicSubnetIds,
    securityGroups: [network.securityGroups.alb],
    tags: {
      ...commonTags,
      Name: `${appName}-lb`,
      Type: 'application-load-balancer',
      App: app.name,
    },
  });

  // Create target group for this app
  const targetGroup = new aws.lb.TargetGroup(`${appName}-tg-v2`, {
    name: `${appName}-tg-v2`.substring(0, 32), // AWS limit - add v2 to avoid conflicts
    port: app.containerPort,
    protocol: 'HTTP',
    targetType: 'ip',
    vpcId: network.vpcId,
    healthCheck: {
      enabled: true,
      path: app.healthCheck?.path || '/health',
      interval: app.healthCheck?.interval || 60,
      timeout: app.healthCheck?.timeout || 30,
      healthyThreshold: app.healthCheck?.healthyThreshold || 2,
      unhealthyThreshold: app.healthCheck?.unhealthyThreshold || 3,
      matcher: '200',
    },
    tags: {
      ...commonTags,
      Name: `${appName}-tg-v2`,
      Type: 'target-group',
      App: app.name,
    },
  });

  // Create HTTP listener - no routing rules needed, direct to target group
  const httpListener = new aws.lb.Listener(`${appName}-http-listener`, {
    loadBalancerArn: lb.arn,
    port: 80,
    protocol: 'HTTP',
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: targetGroup.arn,
      },
    ],
    tags: {
      ...commonTags,
      Name: `${appName}-http-listener`,
      Type: 'listener',
      App: app.name,
    },
  });

  return {
    albArn: lb.arn,
    albDnsName: lb.dnsName,
    albZoneId: lb.zoneId,
    targetGroupArn: targetGroup.arn,
    applicationUrl: lb.dnsName.apply((dns) => `http://${dns}`),
    healthCheckUrl: lb.dnsName.apply((dns) => `http://${dns}${app.healthCheck?.path || '/health'}`),
    httpListenerArn: httpListener.arn,
    certificateArn: undefined,
  };
}

// Main function to create load balancers for all applications
export function createLoadBalancers(
  config: CommonConfig,
  network: NetworkOutputs,
  applications: ApplicationConfig[],
) {
  return applications.map((app) => ({
    app: app.name,
    loadBalancer: createApplicationLoadBalancer(config, network, app),
  }));
}
