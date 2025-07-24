import * as pulumi from '@pulumi/pulumi';
// import * as tailscale from "@pulumi/tailscale";  // Available for future Tailscale provider usage
import * as dotenv from 'dotenv';
import { createApplicationOutputs } from './modules/app-outputs';
import { createAppSecrets } from './modules/app-secrets';
import { createBuildSystem } from './modules/build';
import { createConfig } from './modules/config';
import { createContainer } from './modules/container';
import { createDatabase } from './modules/database';
import { createDNSOutputs, createDeploymentInstructions } from './modules/dns-utils';
import { createGithubOidc } from './modules/github-oidc';
import { createLoadBalancers } from './modules/loadbalancer';
import { createMonitoring } from './modules/monitoring';
import { createNetworking } from './modules/networking';
import { createScaling } from './modules/scaling';
import { createSSLCertificates } from './modules/ssl';
import { createTailscale } from './modules/tailscale';
import { validateApplicationConfigs } from './modules/validation';
import { ApplicationConfig } from './types';

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
const enableHttps = pathfinderConfig.getBoolean('enableHttps') ?? false;

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
    // OPTION 1: Use custom domain (uncomment the routing section below)
    routing: {
      hostnames: ['app-aws.trycomp.ai'],
    },
    // OPTION 2: No routing config = uses ALB DNS directly
    // (just comment out the routing section above)
    healthCheck: {
      path: '/api/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
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
      'APP_AWS_BUCKET_NAME',
      'APP_AWS_REGION',
      'APP_AWS_ACCESS_KEY_ID',
      'APP_AWS_SECRET_ACCESS_KEY',
      'DISCORD_WEBHOOK_URL',
      'SLACK_SALES_WEBHOOK',
      'HUBSPOT_ACCESS_TOKEN',
    ],
    includeDatabaseUrl: true,
    environmentVariables: {
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
  {
    name: 'portal',
    containerPort: 3001,
    // OPTION 1: Use custom domain (uncomment the routing section below)
    routing: {
      hostnames: ['portal-aws.trycomp.ai'],
    },
    // OPTION 2: No routing config = uses ALB DNS directly
    // (just comment out the routing section above)
    healthCheck: {
      path: '/health',
      interval: 30,
      timeout: 5,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    },
    cpu: 256,
    memory: 512,
    desiredCount: 1,
    minCount: 1,
    maxCount: 5,
    targetCPUPercent: 70,
    requiredSecrets: [
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'RESEND_API_KEY',
      'NEXT_PUBLIC_BETTER_AUTH_URL',
    ],
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

// 4. SSL Certificates - Create certificates for custom domains
const ssl = createSSLCertificates(config, applications);

// 5. Load Balancing - ALB with Health Checks and SSL
const loadBalancers = createLoadBalancers(
  config,
  network,
  applications,
  ssl.certificates,
  enableHttps,
);

// 6. Container Platform - Multi-app ECS support
const container = createContainer(
  config,
  applications,
  network,
  database,
  loadBalancers,
  appSecrets,
);

// 7. Build System - CodeBuild with VPC Database Access
const build = createBuildSystem(config, network, database, container, appSecrets);

// 8. Wire up applications
const deployments = applications.map((app, index) => {
  const appContainer = container.applications![index];
  const appLoadBalancer = loadBalancers.find((lb) => lb.app === app.name)?.loadBalancer;

  // Create build project for this app
  const buildProject = build.createApplicationBuildProject(app, appContainer);

  // No routing rules needed with multiple ALBs

  return {
    app,
    buildProject,
    container: appContainer,
    loadBalancer: appLoadBalancer,
  };
});

// 9. Auto-scaling - ECS Service Scaling (pass first load balancer for now)
const scaling = createScaling(config, applications, container, loadBalancers[0]?.loadBalancer);

// 10. GitHub OIDC - For GitHub Actions authentication
const githubOidc = createGithubOidc(config);

// ==========================================
// OPTIONAL INFRASTRUCTURE (FEATURE-GATED)
// ==========================================

// 11. Development Access - Tailscale Subnet Router (Optional)
const tailscale = enableTailscale ? createTailscale(config, network, database) : undefined;

// 12. Observability - Better Stack + CloudWatch (Optional/Configurable)
const appContainers =
  container.applications?.reduce(
    (acc, appContainer, index) => {
      acc[applications[index].name] = appContainer;
      return acc;
    },
    {} as Record<string, (typeof container.applications)[0]>,
  ) || {};

const monitoring = createMonitoring(
  config,
  applications,
  database,
  appContainers,
  loadBalancers[0]?.loadBalancer,
  {
    enableBetterStack,
    enableDetailedMonitoring,
  },
);

// ==========================================
// DNS AND DEPLOYMENT OUTPUTS
// ==========================================

// Create consolidated DNS outputs
const dnsOutputs = createDNSOutputs(
  applications,
  ssl.validationRecords,
  loadBalancers,
  projectName,
  enableHttps,
);

// ==========================================
// STACK OUTPUTS
// ==========================================

// Application-specific outputs (from utility module)
export const applicationOutputs = createApplicationOutputs(deployments, appSecrets);

// Infrastructure outputs
export const clusterName = container.clusterName;

// Database outputs
export const databaseEndpoint = database.endpoint;
export const databaseName = database.dbName;

// Migration outputs
export const migrationProjectName = build.migrationProject.name;
export const runMigrationsCommand = pulumi.interpolate`aws codebuild start-build --project-name ${build.migrationProject.name}`;

// Monitoring outputs
export const dashboardUrl = monitoring.applicationDashboardUrl;
export const infrastructureDashboardUrl = monitoring.infrastructureDashboardUrl;

// DNS setup (only if custom domains are configured)
export const allDnsRecords =
  ssl.validationRecords.length > 0 ? dnsOutputs.allDnsRecords : undefined;

// Deployment instructions (from utility module)
export const deploymentInstructions = createDeploymentInstructions(
  migrationProjectName,
  ssl.validationRecords,
  enableHttps,
  projectName,
  applications,
  loadBalancers,
);

// Tailscale connection guide (only if enabled)
export const tailscaleConnectionGuide = enableTailscale
  ? pulumi.interpolate`
# Connect to database through Tailscale:
# 1. Ensure you're connected to Tailscale network
# 2. Use: postgresql://${database.username}:[PASSWORD]@${database.endpoint}:${database.port}/${database.dbName}?sslmode=require
# 3. Get password with: pulumi stack output databasePassword --show-secrets (if stored)
`
  : undefined;
