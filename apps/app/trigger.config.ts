import { PrismaInstrumentation } from '@prisma/instrumentation';
import { puppeteer } from '@trigger.dev/build/extensions/puppeteer';
import { defineConfig } from '@trigger.dev/sdk';
import { prismaExtension } from './customPrismaExtension';

export default defineConfig({
  runtime: 'node-22',
  project: 'proj_lhxjliiqgcdyqbgtucda',
  logLevel: 'log',
  instrumentations: [new PrismaInstrumentation()],
  maxDuration: 300, // 5 minutes
  build: {
    extensions: [
      prismaExtension({
        version: '7.6.0',
        dbPackageVersion: '^2.0.0',
      }),
      puppeteer(),
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
