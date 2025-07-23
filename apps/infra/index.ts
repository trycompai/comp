import * as pulumi from '@pulumi/pulumi';
// import * as tailscale from "@pulumi/tailscale";  // Available for future Tailscale provider usage
import * as dotenv from 'dotenv';
import { createAppSecrets } from './modules/app-secrets';
import { createBuildSystem } from './modules/build';
import { createConfig } from './modules/config';
import { createContainer } from './modules/container';
import { createDatabase } from './modules/database';
import { createGithubOidc } from './modules/github-oidc';
import { createApplicationRouting, createLoadBalancer } from './modules/loadbalancer';
import { createMonitoring } from './modules/monitoring';
import { createNetworking } from './modules/networking';
import { createScaling } from './modules/scaling';
import { createTailscale } from './modules/tailscale';
import { validateApplicationConfigs } from './modules/validation';
import { ApplicationConfig, ApplicationOutput } from './types';

// Load environment variables from .env file
dotenv.config();

if (!process.env.PULUMI_PROJECT_NAME) {
  throw new Error('PULUMI_PROJECT_NAME is not set');
}

const projectName = process.env.PULUMI_PROJECT_NAME;

// ==========================================
// FEATURE CONFIGURATION
// ==========================================
const pathfinderConfig = new pulumi.Config(projectName);
const enableTailscale = pathfinderConfig.getBoolean('enableTailscale') ?? false;
const enableBetterStack = pathfinderConfig.getBoolean('enableBetterStack') ?? false;
const enableDetailedMonitoring = pathfinderConfig.getBoolean('enableDetailedMonitoring') ?? false;

// ==========================================
// INFRASTRUCTURE CONFIGURATION
// ==========================================
const config = createConfig(projectName);

// ==========================================
// APPLICATION CONFIGURATIONS
// ==========================================
const applications: ApplicationConfig[] = [
  {
    name: 'app',
    containerPort: 3000,
    healthCheck: {
      path: '/api/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    routing: {
      pathPattern: '/*', // Default route
    },
    cpu: 256,
    memory: 512,
    desiredCount: 2,
    minCount: 1,
    maxCount: 10,
    targetCPUPercent: 70,
    requiredSecrets: [
      // Core authentication and security
      'AUTH_SECRET',
      'RESEND_API_KEY', // For sending emails, and magic link sign in.
      'REVALIDATION_SECRET',
      'SECRET_KEY', // For encrypting api keys
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'OPENAI_API_KEY', // Used for populating policies with AI
      'TRIGGER_SECRET_KEY',
      'NEXT_PUBLIC_PORTAL_URL',

      // Optional - comment out if not used.
      'AUTH_GOOGLE_ID',
      'AUTH_GOOGLE_SECRET',
      'AUTH_GITHUB_ID',
      'AUTH_GITHUB_SECRET',
      'AWS_BUCKET_NAME',
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'DISCORD_WEBHOOK_URL',
      'SLACK_SALES_WEBHOOK',
      'HUBSPOT_ACCESS_TOKEN',
      'IS_VERCEL',
    ],
    includeDatabaseUrl: true,
    environmentVariables: {
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_PORTAL_URL: 'PLACEHOLDER', // This will be injected from secrets
    },
  },
  {
    name: 'portal',
    containerPort: 3001,
    healthCheck: {
      path: '/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    routing: {
      pathPattern: '/portal/*',
    },
    cpu: 256,
    memory: 512,
    desiredCount: 1,
    minCount: 1,
    maxCount: 5,
    targetCPUPercent: 70,
    requiredSecrets: ['PORTAL_API_KEY'],
    includeDatabaseUrl: true,
    environmentVariables: {
      NODE_ENV: 'production',
    },
  },
];

// Validate configurations before creating resources
validateApplicationConfigs(applications);

// ==========================================
// CORE INFRASTRUCTURE (ALWAYS DEPLOYED)
// ==========================================

// 1. Foundation Layer - VPC, Subnets, Security Groups
const network = createNetworking(config, applications);

// 2. Data Layer - Private RDS PostgreSQL
const database = createDatabase(config, network);

// 3. Application Secrets - Per-app secrets
const appSecrets = createAppSecrets(config, applications);

// 4. Load Balancing - ALB with Health Checks
const loadBalancer = createLoadBalancer(config, network);

// 5. Container Platform - Multi-app ECS support
const container = createContainer(
  config,
  applications,
  network,
  database,
  loadBalancer,
  appSecrets,
);

// 6. Build System - CodeBuild with VPC Database Access
const build = createBuildSystem(config, network, database, container, appSecrets);

// 7. Wire up applications
const deployments = applications.map((app, index) => {
  const appContainer = container.applications![index];

  // Create build project for this app
  const buildProject = build.createApplicationBuildProject(app, appContainer);

  // Create routing rules if app has routing config and target group
  if (app.routing && appContainer.targetGroupArn) {
    createApplicationRouting({
      projectName: config.projectName,
      appName: app.name,
      loadBalancerArn: loadBalancer.albArn,
      targetGroupArn: appContainer.targetGroupArn,
      pathPattern: app.routing.pathPattern,
      hostHeader: app.routing.hostnames,
      priority: (index + 1) * 100,
      httpListenerArn: loadBalancer.httpListenerArn,
    });
  }

  return {
    app,
    buildProject,
    container: appContainer,
  };
});

// 8. Auto-scaling - ECS Service Scaling
const scaling = createScaling(config, applications, container, loadBalancer);

// 9. GitHub OIDC - For GitHub Actions authentication
const githubOidc = createGithubOidc(config);

// ==========================================
// OPTIONAL INFRASTRUCTURE (FEATURE-GATED)
// ==========================================

// 10. Development Access - Tailscale Subnet Router (Optional)
const tailscale = enableTailscale ? createTailscale(config, network, database) : undefined;

// 11. Observability - Better Stack + CloudWatch (Optional/Configurable)
const appContainers =
  container.applications?.reduce(
    (acc, appContainer, index) => {
      acc[applications[index].name] = appContainer;
      return acc;
    },
    {} as Record<string, (typeof container.applications)[0]>,
  ) || {};

const monitoring = createMonitoring(config, applications, database, appContainers, loadBalancer, {
  enableBetterStack,
  enableDetailedMonitoring,
});

// ==========================================
// STACK OUTPUTS
// ==========================================

// Application-specific outputs
export const applicationOutputs = deployments.reduce(
  (acc, deployment) => {
    const appName = deployment.app.name;

    // Build URL based on routing config
    const appUrl = deployment.app.routing?.pathPattern
      ? pulumi.interpolate`${loadBalancer.applicationUrl}${deployment.app.routing.pathPattern.replace('/*', '')}`
      : deployment.app.routing?.hostnames
        ? pulumi.interpolate`http://${deployment.app.routing.hostnames[0]}`
        : loadBalancer.applicationUrl;

    acc[appName] = {
      url: appUrl,
      serviceName: deployment.container.serviceName,
      ecrRepository: deployment.container.repositoryUrl,
      logGroup: deployment.container.logGroupName,
      buildProject: deployment.buildProject.name,
      healthCheckUrl: pulumi.interpolate`${appUrl}${deployment.app.healthCheck?.path || '/health'}`,
      secretArn: appSecrets[deployment.app.name]?.secretArn,
      deployCommand: pulumi.interpolate`aws codebuild start-build --project-name ${deployment.buildProject.name}`,
    };

    return acc;
  },
  {} as Record<string, ApplicationOutput>,
);

// Infrastructure outputs
export const albUrl = loadBalancer.applicationUrl;
export const clusterName = container.clusterName;

// Database outputs
export const databaseEndpoint = database.endpoint;
export const databaseName = database.dbName;

// Migration outputs
export const migrationProjectName = build.migrationProject.name;
export const runMigrationsCommand = pulumi.interpolate`aws codebuild start-build --project-name ${build.migrationProject.name}`;

// Tailscale outputs (if enabled)
export const tailscaleEnabled = enableTailscale;
export const tailscaleConnectionGuide = enableTailscale
  ? pulumi.interpolate`
# Connect to database through Tailscale:
# 1. Ensure you're connected to Tailscale network
# 2. Use: postgresql://${database.username}:[PASSWORD]@${database.endpoint}:${database.port}/${database.dbName}?sslmode=require
# 3. Get password with: pulumi stack output databasePassword --show-secrets (if stored)
`
  : 'Tailscale not enabled';

// Monitoring outputs
export const dashboardUrl = monitoring.applicationDashboardUrl;
export const infrastructureDashboardUrl = monitoring.infrastructureDashboardUrl;

// Deployment instructions
export const deploymentInstructions = pulumi
  .all([migrationProjectName, applicationOutputs['app']?.deployCommand || pulumi.output('')])
  .apply(
    ([migrationProject, appDeployCmd]) => `
IMPORTANT: Deployment Order
===========================
1. FIRST run database migrations (required before any app deployment):
   aws codebuild start-build --project-name ${migrationProject}
   
2. THEN deploy applications (can be run in parallel):
   - App: ${appDeployCmd}
   - Portal: aws codebuild start-build --project-name [portal-project-name]
   
3. Monitor deployments:
   - CodeBuild console for build progress
   - ECS console for service updates
   - CloudWatch logs for runtime issues

To update secrets:
1. Go to AWS Secrets Manager
2. Find the secret for your app (format: ${projectName}/{appName}/secrets-*)
3. Update the secret values as needed
`,
  );
