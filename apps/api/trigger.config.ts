import { defineConfig } from '@trigger.dev/sdk';
import { caBundleExtension } from './caBundleExtension';
import { prismaExtension } from './customPrismaExtension';
import { emailExtension } from './emailExtension';
import { integrationPlatformExtension } from './integrationPlatformExtension';

export default defineConfig({
  runtime: 'node-22',
  project: 'proj_zhioyrusqertqgafqgpj', // API project
  logLevel: 'log',
  maxDuration: 300, // 5 minutes
  build: {
    // The 1Password SDK ships a native WASM core; keep it external so it's
    // resolved from node_modules at runtime instead of being bundled by esbuild.
    external: ['@1password/sdk'],
    extensions: [
      caBundleExtension(),
      prismaExtension({
        version: '7.6.0',
        dbPackageVersion: '^2.0.0',
      }),
      integrationPlatformExtension(),
      emailExtension(),
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
