import { PrismaInstrumentation } from '@prisma/instrumentation';
import { syncVercelEnvVars } from '@trigger.dev/build/extensions/core';

import { puppeteer } from '@trigger.dev/build/extensions/puppeteer';
import { defineConfig } from '@trigger.dev/sdk/v3';
import { PrismaExtension } from './customPrismaExtension';

export default defineConfig({
  project: 'proj_lhxjliiqgcdyqbgtucda',
  logLevel: 'log',
  instrumentations: [new PrismaInstrumentation()],
  maxDuration: 300, // 5 minutes
  build: {
    extensions: [
      new PrismaExtension({
        schema: '../../packages/db/prisma',
        version: '6.6.0',
        clientGenerator: 'client',
        isUsingSchemaFolder: true,
      }),
      puppeteer(),
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
  dirs: ['./src/jobs', './src/trigger'],
});
