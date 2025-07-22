import * as awsx from '@pulumi/awsx';
import { CommonConfig, NetworkOutputs } from '../types';

export function createLoadBalancer(config: CommonConfig, network: NetworkOutputs) {
  const { commonTags } = config;

  // Simple working load balancer (copied from legacy)
  const lb = new awsx.lb.ApplicationLoadBalancer(`${config.projectName}-lb`, {
    subnetIds: network.publicSubnetIds,
    securityGroups: [network.securityGroups.alb],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-lb`,
      Type: 'application-load-balancer',
    },
    defaultTargetGroup: {
      port: 3000,
      protocol: 'HTTP',
      targetType: 'ip', // Required for Fargate
      healthCheck: {
        enabled: true,
        path: '/',
        healthyThreshold: 2,
        unhealthyThreshold: 3,
        timeout: 30,
        interval: 60,
        matcher: '200',
      },
    },
  });

  return {
    albArn: lb.loadBalancer.arn,
    albDnsName: lb.loadBalancer.dnsName,
    albZoneId: lb.loadBalancer.zoneId,
    targetGroupArn: lb.defaultTargetGroup.arn,
    applicationUrl: lb.loadBalancer.dnsName.apply((dns) => `http://${dns}`),
    healthCheckUrl: lb.loadBalancer.dnsName.apply((dns) => `http://${dns}/health`),
    certificateArn: undefined,
  };
}
