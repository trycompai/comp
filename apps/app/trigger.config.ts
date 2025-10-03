import { PrismaInstrumentation } from '@prisma/instrumentation';
import { syncVercelEnvVars } from '@trigger.dev/build/extensions/core';
import { puppeteer } from '@trigger.dev/build/extensions/puppeteer';
import { defineConfig } from '@trigger.dev/sdk';
import { prismaExtension } from './customPrismaExtension';

type BuildExtensionType =
  | ReturnType<typeof prismaExtension>
  | ReturnType<typeof puppeteer>
  | ReturnType<typeof syncVercelEnvVars>;

const buildExtensions: BuildExtensionType[] = [
  prismaExtension({
    version: '6.13.0',
    dbPackageVersion: '^1.3.7', // Version of @trycompai/db package with compiled JS
  }),
  puppeteer(),
];

// Only enable Vercel sync when project is configured to avoid noise locally.
if (process.env.VERCEL_PROJECT_ID) {
  buildExtensions.push(syncVercelEnvVars());
}

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  logLevel: 'log',
  instrumentations: [new PrismaInstrumentation()],
  maxDuration: 300, // 5 minutes
  build: {
    extensions: buildExtensions,
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
