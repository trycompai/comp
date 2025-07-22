import * as pulumi from '@pulumi/pulumi';
import * as dotenv from 'dotenv';
import { CommonConfig } from '../types';

// Load environment variables from .env file
dotenv.config();

export function createConfig(projectName: string): CommonConfig {
  if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION is not set');
  }

  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV is not set');
  }

  if (!process.env.ENABLE_DEBUG_ENDPOINTS) {
    throw new Error('ENABLE_DEBUG_ENDPOINTS is not set');
  }

  if (!process.env.GITHUB_ORG) {
    throw new Error('GITHUB_ORG is not set');
  }

  if (!process.env.GITHUB_REPO) {
    throw new Error('GITHUB_REPO is not set');
  }

  if (!process.env.DOMAIN_NAME) {
    throw new Error('DOMAIN_NAME is not set');
  }

  if (!process.env.ENABLE_RDS_READ_REPLICAS) {
    throw new Error('ENABLE_RDS_READ_REPLICAS is not set');
  }

  const stack = pulumi.getStack(); // dev, staging, prod
  const pulumiConfig = new pulumi.Config(projectName);

  // Feature flags
  const enableTailscale = pulumiConfig.getBoolean('enableTailscale') ?? false;
  const enableBetterStack = pulumiConfig.getBoolean('enableBetterStack') ?? false;
  // const enableDetailedMonitoring = pulumiConfig.getBoolean('enableDetailedMonitoring') ?? false;

  // Base configuration applicable to all environments
  const baseConfig = {
    projectName,
    enableRDSReadReplicas: process.env.ENABLE_RDS_READ_REPLICAS === 'true',
    region: process.env.AWS_REGION,
    awsRegion: process.env.AWS_REGION,
    nodeEnv: process.env.NODE_ENV,
    enableDebugEndpoints: process.env.ENABLE_DEBUG_ENDPOINTS === 'true',
    domainName: process.env.DOMAIN_NAME,
    githubOrg: process.env.GITHUB_ORG,
    githubRepo: process.env.GITHUB_REPO,
    commonTags: {
      Project: projectName,
      Environment: stack,
      ManagedBy: 'pulumi',
      Owner: 'compai',
      CreatedDate: new Date().toISOString().split('T')[0],
    },
  };

  // Environment-specific configurations
  const environmentConfigs = {
    dev: {
      database: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        deletionProtection: false,
        backupRetentionPeriod: 3,
      },
      scaling: {
        minCapacity: 1,
        maxCapacity: 3,
        targetCpuUtilization: 70,
      },
      tailscale: {
        instanceType: 't3.nano',
      },
      monitoring: {
        logRetentionDays: 3,
        detailedMonitoring: false,
      },
      networking: {
        vpcCidr: '10.0.0.0/16',
        subnets: {
          public: [
            { cidr: '10.0.1.0/24', az: 0 },
            { cidr: '10.0.2.0/24', az: 1 },
          ],
          private: [
            { cidr: '10.0.10.0/24', az: 0 },
            { cidr: '10.0.20.0/24', az: 1 },
          ],
        },
      },
      security: {
        allowedCidrBlocks: ['0.0.0.0/0'],
        enableWaf: false,
      },
    },
    staging: {
      database: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 50,
        maxAllocatedStorage: 200,
        deletionProtection: false,
        backupRetentionPeriod: 7,
      },
      scaling: {
        minCapacity: 2,
        maxCapacity: 5,
        targetCpuUtilization: 60,
      },
      tailscale: {
        instanceType: 't3.nano',
      },
      monitoring: {
        logRetentionDays: 7,
        detailedMonitoring: true,
      },
      networking: {
        vpcCidr: '10.1.0.0/16',
        subnets: {
          public: [
            { cidr: '10.1.1.0/24', az: 0 },
            { cidr: '10.1.2.0/24', az: 1 },
          ],
          private: [
            { cidr: '10.1.10.0/24', az: 0 },
            { cidr: '10.1.20.0/24', az: 1 },
          ],
        },
      },
      security: {
        allowedCidrBlocks: ['0.0.0.0/0'],
        enableWaf: true,
      },
    },
    prod: {
      database: {
        instanceClass: 'db.t3.medium',
        allocatedStorage: 100,
        maxAllocatedStorage: 1000,
        deletionProtection: true,
        backupRetentionPeriod: 30,
      },
      scaling: {
        minCapacity: 3,
        maxCapacity: 20,
        targetCpuUtilization: 50,
      },
      tailscale: {
        instanceType: 't3.small', // Slightly larger for prod
      },
      monitoring: {
        logRetentionDays: 30,
        detailedMonitoring: true,
      },
      networking: {
        vpcCidr: '10.2.0.0/16',
        subnets: {
          public: [
            { cidr: '10.2.1.0/24', az: 0 },
            { cidr: '10.2.2.0/24', az: 1 },
          ],
          private: [
            { cidr: '10.2.10.0/24', az: 0 },
            { cidr: '10.2.20.0/24', az: 1 },
          ],
        },
      },
      security: {
        allowedCidrBlocks: ['0.0.0.0/0'],
        enableWaf: true,
      },
    },
  };

  const envConfig =
    environmentConfigs[stack as keyof typeof environmentConfigs] || environmentConfigs.dev;

  return {
    ...baseConfig,
    // Merge environment-specific config directly
    dbInstanceClass: envConfig.database.instanceClass,
    dbAllocatedStorage: envConfig.database.allocatedStorage,
    dbMaxAllocatedStorage: envConfig.database.maxAllocatedStorage,
    dbBackupRetentionPeriod: envConfig.database.backupRetentionPeriod,
    dbDeletionProtection: envConfig.database.deletionProtection,
    logRetentionDays: envConfig.monitoring.logRetentionDays,
    networkConfig: envConfig.networking,
    securityConfig: envConfig.security,

    // Load sensitive configuration from Pulumi config (only if features enabled)
    tailscale: enableTailscale
      ? {
          apiKey: new pulumi.Config('tailscale').getSecret('apiKey') || pulumi.output('NOT_SET'),
          tailnet: new pulumi.Config('tailscale').get('tailnet') || 'NOT_SET',
          authKey: new pulumi.Config('tailscale').getSecret('authKey') || pulumi.output('NOT_SET'),
        }
      : undefined,
    betterStack: enableBetterStack
      ? {
          entrypoint:
            new pulumi.Config('betterstack').getSecret('entrypoint') || pulumi.output('NOT_SET'),
          sourceToken:
            new pulumi.Config('betterstack').getSecret('sourceToken') || pulumi.output('NOT_SET'),
        }
      : undefined,
  };
}

// Removed duplicate feature flags - they're now handled in createConfig() function
