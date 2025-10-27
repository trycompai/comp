import { PrismaInstrumentation } from '@prisma/instrumentation';
import { syncVercelEnvVars } from '@trigger.dev/build/extensions/core';
import { puppeteer } from '@trigger.dev/build/extensions/puppeteer';
import { defineConfig } from '@trigger.dev/sdk';
import { prismaExtension } from './customPrismaExtension';

export default defineConfig({
  project: 'proj_lhxjliiqgcdyqbgtucda',
  logLevel: 'log',
  instrumentations: [new PrismaInstrumentation()],
  maxDuration: 300, // 5 minutes
  build: {
    extensions: [
      prismaExtension({
        version: '6.13.0',
        dbPackageVersion: '^1.3.15', // Version of @trycompai/db package with compiled JS
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
