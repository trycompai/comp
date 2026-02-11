import { syncVercelEnvVars } from '@trigger.dev/build/extensions/core';
import { defineConfig } from '@trigger.dev/sdk';
import { prismaExtension } from './customPrismaExtension';
import { integrationPlatformExtension } from './integrationPlatformExtension';

export default defineConfig({
  project: 'proj_zhioyrusqertqgafqgpj', // API project
  logLevel: 'log',
  maxDuration: 300, // 5 minutes
  build: {
    external: ['@prisma/client', '@prisma/engines', '.prisma/client'],
    extensions: [
      prismaExtension({
        version: '7.0.0',
        dbPackageVersion: '^1.3.22', // Version of @trycompai/db package with compiled JS
      }),
      integrationPlatformExtension(),
      syncVercelEnvVars(),
    ],
  },
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./src/trigger'],
});
