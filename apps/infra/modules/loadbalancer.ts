import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { ApplicationConfig, CommonConfig, NetworkOutputs } from '../types';

// Create individual ALB for each application
export function createApplicationLoadBalancer(
  config: CommonConfig,
  network: NetworkOutputs,
  app: ApplicationConfig,
  certificate?: aws.acm.Certificate,
  enableHttps?: boolean,
) {
  const { commonTags } = config;
  const appName = `${config.projectName}-${app.name}`;
  const hasCustomDomain = app.routing?.hostnames && app.routing.hostnames.length > 0;

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

  // Create HTTP listener
  // If HTTPS is enabled and certificates exist: redirect to HTTPS
  // Otherwise: serve HTTP directly
  const shouldRedirectToHttps = enableHttps && hasCustomDomain && certificate;

  const httpListener = new aws.lb.Listener(`${appName}-http-listener`, {
    loadBalancerArn: lb.arn,
    port: 80,
    protocol: 'HTTP',
    defaultActions: shouldRedirectToHttps
      ? [
          {
            type: 'redirect',
            redirect: {
              port: '443',
              protocol: 'HTTPS',
              statusCode: 'HTTP_301',
            },
          },
        ]
      : [
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

  // Create HTTPS listener only if explicitly enabled
  let httpsListener: aws.lb.Listener | undefined;
  if (enableHttps && hasCustomDomain && certificate) {
    httpsListener = new aws.lb.Listener(`${appName}-https-listener`, {
      loadBalancerArn: lb.arn,
      port: 443,
      protocol: 'HTTPS',
      sslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01',
      certificateArn: certificate.arn,
      defaultActions: [
        {
          type: 'forward',
          targetGroupArn: targetGroup.arn,
        },
      ],
      tags: {
        ...commonTags,
        Name: `${appName}-https-listener`,
        Type: 'listener',
        App: app.name,
      },
    });
  }

  // Determine the application URL based on configuration
  const applicationUrl =
    enableHttps && hasCustomDomain && certificate
      ? pulumi.output(`https://${app.routing!.hostnames![0]}`)
      : hasCustomDomain
        ? pulumi.output(`http://${app.routing!.hostnames![0]}`)
        : lb.dnsName.apply((dns) => `http://${dns}`);

  const healthCheckUrl = hasCustomDomain
    ? pulumi.output(
        `${enableHttps && certificate ? 'https' : 'http'}://${app.routing!.hostnames![0]}${app.healthCheck?.path || '/health'}`,
      )
    : lb.dnsName.apply((dns) => `http://${dns}${app.healthCheck?.path || '/health'}`);

  return {
    albArn: lb.arn,
    albDnsName: lb.dnsName,
    albZoneId: lb.zoneId,
    targetGroupArn: targetGroup.arn,
    applicationUrl,
    healthCheckUrl,
    httpListenerArn: httpListener.arn,
    httpsListenerArn: httpsListener?.arn,
    certificateArn: certificate?.arn,
    hasCustomDomain,
  };
}

// Main function to create load balancers for all applications
export function createLoadBalancers(
  config: CommonConfig,
  network: NetworkOutputs,
  applications: ApplicationConfig[],
  certificates?: Record<string, aws.acm.Certificate>,
  enableHttps?: boolean,
) {
  return applications.map((app) => {
    // Find certificate for this app's first hostname (if it has one)
    const hostname = app.routing?.hostnames?.[0];
    const certificate = hostname && certificates ? certificates[hostname] : undefined;

    return {
      app: app.name,
      loadBalancer: createApplicationLoadBalancer(config, network, app, certificate, enableHttps),
    };
  });
}
