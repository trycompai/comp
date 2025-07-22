import * as pulumi from '@pulumi/pulumi';
// import * as tailscale from "@pulumi/tailscale";  // Available for future Tailscale provider usage
import * as dotenv from 'dotenv';
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

// 3. Load Balancing - ALB with Health Checks (create target group first)
const loadBalancer = createLoadBalancer(config, network);

// 4. Container Platform - ECR, ECS Cluster (with load balancer integration)
const container = createContainer(config, network, database, loadBalancer);

// 5. Build System - CodeBuild with VPC Database Access
const build = createBuildSystem(config, network, database, container);

// 6. Auto-scaling - ECS Service Scaling
const scaling = createScaling(config, container, loadBalancer);

// 7. GitHub OIDC - For GitHub Actions authentication
const githubOidc = createGithubOidc(config);

// ==========================================
// OPTIONAL INFRASTRUCTURE (FEATURE-GATED)
// ==========================================

// 8. Development Access - Tailscale Subnet Router (Optional)
const tailscale = enableTailscale ? createTailscale(config, network, database) : undefined;

// 9. Observability - Better Stack + CloudWatch (Optional/Configurable)
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
export const url = loadBalancer.applicationUrl;
export const albDns = loadBalancer.albDnsName;
export const applicationUrl = loadBalancer.applicationUrl;

// Infrastructure details
export const ecrRepositoryUrl = container.repositoryUrl;
export const ecsClusterName = container.clusterName;
export const ecsServiceName = container.serviceName;

// Database connection information
export const database_endpoint = database.endpoint;
export const database_port = pulumi.output(5432);
export const database_name = database.dbName;
export const database_username = database.username;

// Tailscale-accessible database information (if Tailscale enabled)
export const tailscale_enabled = enableTailscale;
export const tailscale_database_host = enableTailscale ? database.endpoint : undefined;
export const tailscale_database_url = enableTailscale
  ? pulumi.interpolate`postgresql://${database.username}:${database.password}@${database.endpoint}:5432/${database.dbName}?sslmode=require`
  : undefined;
export const tailscale_router_ip = enableTailscale ? tailscale?.instancePrivateIp : undefined;
export const tailscale_connection_guide = enableTailscale
  ? pulumi.interpolate`
# Connect to database through Tailscale:
# 1. Ensure you're connected to Tailscale network
# 2. Use this connection string: postgresql://${database.username}:[PASSWORD]@${database.endpoint}:5432/${database.dbName}?sslmode=require
# 3. Get password with: pulumi stack output database_password --show-secrets
`
  : 'Tailscale not enabled for this environment';

// Better Stack information (if enabled)
export const betterstack_enabled = enableBetterStack;
export const betterstack_lambda_arn = enableBetterStack
  ? monitoring.logForwarderFunctionArn
  : undefined;

// Repository and cluster information
export const ecr_repository_url = container.repositoryUrl;
export const ecs_cluster_name = container.clusterName;
export const repositoryUrl = container.repositoryUrl;
export const databaseEndpoint = database.endpoint;

// Security outputs (marked as secrets)
export const database_password = pulumi.secret(database.password);
export const tailscale_auth_key = enableTailscale
  ? pulumi.secret(tailscale?.authSecretArn)
  : undefined;
