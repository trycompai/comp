import * as pulumi from '@pulumi/pulumi';
// import * as tailscale from "@pulumi/tailscale";  // Available for future Tailscale provider usage
import * as dotenv from 'dotenv';
import { createAppSecrets } from './modules/app-secrets';
import { createBuildSystem } from './modules/build';
import { createConfig } from './modules/config';
import { createContainer } from './modules/container';
import { createDatabase } from './modules/database';
import { createGithubOidc } from './modules/github-oidc';
import { createLoadBalancer } from './modules/loadbalancer';
import { createMonitoring } from './modules/monitoring';
import { createNetworking } from './modules/networking';
import { createScaling } from './modules/scaling';
import { createTailscale } from './modules/tailscale';

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
// CORE INFRASTRUCTURE (ALWAYS DEPLOYED)
// ==========================================

// 1. Foundation Layer - VPC, Subnets, Security Groups
const network = createNetworking(config);

// 2. Data Layer - Private RDS PostgreSQL
const database = createDatabase(config, network);

// 3. Application Secrets - Separate from database secrets
const appSecrets = createAppSecrets(config);

// 4. Load Balancing - ALB with Health Checks (create target group first)
const loadBalancer = createLoadBalancer(config, network);

// 5. Container Platform - ECR, ECS Cluster (with load balancer integration)
const container = createContainer(config, network, database, loadBalancer, appSecrets);

// 6. Build System - CodeBuild with VPC Database Access
const build = createBuildSystem(config, network, database, container, appSecrets);

// 7. Auto-scaling - ECS Service Scaling
const scaling = createScaling(config, container, loadBalancer);

// 8. GitHub OIDC - For GitHub Actions authentication
const githubOidc = createGithubOidc(config);

// ==========================================
// OPTIONAL INFRASTRUCTURE (FEATURE-GATED)
// ==========================================

// 9. Development Access - Tailscale Subnet Router (Optional)
const tailscale = enableTailscale ? createTailscale(config, network, database) : undefined;

// 10. Observability - Better Stack + CloudWatch (Optional/Configurable)
const monitoring = createMonitoring(config, database, container, loadBalancer, {
  enableBetterStack,
  enableDetailedMonitoring,
});

// ==========================================
// MULTI-APPLICATION DEPLOYMENT
// ==========================================

const applications = [
  {
    name: `${config.projectName}-app`,
    contextPath: '../app',
    requiresDatabaseAccess: true,
    dependsOnMigrations: true,
    buildCommand: 'npm run build',
    healthCheckPath: '/health',
    environmentVariables: {
      NODE_ENV: 'production',
      HOSTNAME: '0.0.0.0',
      PORT: '3000',
    },
    resourceRequirements: {
      cpu: 1024,
      memory: 2048,
    },
    scaling: {
      minInstances: 2,
      maxInstances: 10,
      targetCpuPercent: 60,
    },
  },
];

// Deploy configured applications
// TODO: Implement createApplicationDeployment in build module
applications.map((app) => build.createApplicationDeployment(app, database, container));

// ==========================================
// STACK OUTPUTS (COMPREHENSIVE AS PER PROPOSAL)
// ==========================================

// Core application URLs
export const applicationUrl = loadBalancer.applicationUrl;
export const albDns = loadBalancer.albDnsName;

// Infrastructure details
export const ecrRepositoryUrl = container.repositoryUrl;
export const ecsClusterName = container.clusterName;
export const ecsServiceName = container.serviceName;

// Database connection information
export const databaseEndpoint = database.endpoint;
export const databaseName = database.dbName;
export const databaseUsername = database.username;
export const databasePassword = pulumi.secret(database.password);

// Tailscale-accessible database information (if Tailscale enabled)
export const tailscaleEnabled = enableTailscale;
export const tailscaleConnectionGuide = enableTailscale
  ? pulumi.interpolate`
# Connect to database through Tailscale:
# 1. Ensure you're connected to Tailscale network
# 2. Use this connection string: postgresql://${database.username}:${database.password}@${database.endpoint}:${database.port}/${database.dbName}?sslmode=require
# 3. Get password with: pulumi stack output databasePassword --show-secrets
`
  : 'Tailscale not enabled for this environment';

// Better Stack information (if enabled)
export const betterstackEnabled = enableBetterStack;
export const betterstackLambdaArn = enableBetterStack
  ? monitoring.logForwarderFunctionArn
  : undefined;
