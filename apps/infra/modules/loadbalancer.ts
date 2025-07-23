import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { CommonConfig, NetworkOutputs } from '../types';

export function createLoadBalancer(config: CommonConfig, network: NetworkOutputs) {
  const { commonTags } = config;

  // Create ALB without default target group since we'll create app-specific ones
  const lb = new aws.lb.LoadBalancer(`${config.projectName}-lb`, {
    loadBalancerType: 'application',
    subnets: network.publicSubnetIds,
    securityGroups: [network.securityGroups.alb],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-lb`,
      Type: 'application-load-balancer',
    },
  });

  // Create a default target group (required for listener)
  const defaultTargetGroup = new aws.lb.TargetGroup(`${config.projectName}-default-tg`, {
    name: `${config.projectName}-def-tg`.substring(0, 32), // AWS limit is 32 chars
    port: 80,
    protocol: 'HTTP',
    targetType: 'ip',
    vpcId: network.vpcId,
    healthCheck: {
      enabled: true,
      path: '/',
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      timeout: 30,
      interval: 60,
      matcher: '200',
    },
    tags: {
      ...commonTags,
      Name: `${config.projectName}-def-tg`,
      Type: 'target-group',
    },
  });

  // Create HTTP listener
  const httpListener = new aws.lb.Listener(`${config.projectName}-http-listener`, {
    loadBalancerArn: lb.arn,
    port: 80,
    protocol: 'HTTP',
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: defaultTargetGroup.arn,
      },
    ],
    tags: {
      ...commonTags,
      Name: `${config.projectName}-http-listener`,
      Type: 'listener',
    },
  });

  return {
    albArn: lb.arn,
    albDnsName: lb.dnsName,
    albZoneId: lb.zoneId,
    targetGroupArn: defaultTargetGroup.arn,
    applicationUrl: lb.dnsName.apply((dns) => `http://${dns}`),
    healthCheckUrl: lb.dnsName.apply((dns) => `http://${dns}/health`),
    certificateArn: undefined,
    httpListenerArn: httpListener.arn,
  };
}

// Create listener rules for app routing
export interface ApplicationRoutingArgs {
  projectName: string;
  appName: string;
  loadBalancerArn: pulumi.Output<string>;
  targetGroupArn: pulumi.Output<string>;
  pathPattern?: string;
  hostHeader?: string[];
  priority: number;
  httpListenerArn: pulumi.Output<string>;
}

export function createApplicationRouting(args: ApplicationRoutingArgs) {
  const conditions = [];

  if (args.pathPattern) {
    conditions.push({
      pathPattern: {
        values: [args.pathPattern],
      },
    });
  }

  if (args.hostHeader) {
    conditions.push({
      hostHeader: {
        values: args.hostHeader,
      },
    });
  }

  return new aws.lb.ListenerRule(`${args.projectName}-${args.appName}-rule`, {
    listenerArn: args.httpListenerArn,
    priority: args.priority,
    conditions,
    actions: [
      {
        type: 'forward',
        targetGroupArn: args.targetGroupArn,
      },
    ],
  });
}
