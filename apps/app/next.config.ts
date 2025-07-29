import type { NextConfig } from 'next';
import './src/env.mjs';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@trycompai/db'],

  turbopack: {
    resolveAlias: {
      underscore: 'lodash',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: process.env.LOG_FETCHES === 'true',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
    authInterrupts: true,
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
  skipTrailingSlashRedirect: true,

  // Force Prisma to use binary engine and set paths for Vercel
  env: {
    PRISMA_CLIENT_ENGINE_TYPE: 'binary',
  },

  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    if (isServer) {
      // Copy Prisma binaries during build
      config.plugins = config.plugins || [];

      // Ensure the binaries are copied from the generated client to the proper locations
      const fs = require('fs');
      const path = require('path');

      // Add a plugin to copy binaries after generation
      config.plugins.push({
        apply: (compiler: any) => {
          compiler.hooks.afterEmit.tap('CopyPrismaBindings', () => {
            const sourceDir = path.join(process.cwd(), 'node_modules/.prisma/client');
            const targetDir = path.join(process.cwd(), '.next/server');

            if (fs.existsSync(sourceDir)) {
              const files = fs.readdirSync(sourceDir);
              const binaries = files.filter(
                (file: string) => file.includes('libquery_engine') || file.includes('query-engine'),
              );

              binaries.forEach((binary: string) => {
                const source = path.join(sourceDir, binary);
                const target = path.join(targetDir, binary);

                try {
                  if (fs.existsSync(source)) {
                    fs.mkdirSync(targetDir, { recursive: true });
                    fs.copyFileSync(source, target);
                    console.log(`Copied Prisma binary: ${binary}`);
                  }
                } catch (err) {
                  console.warn(`Failed to copy Prisma binary ${binary}:`, err);
                }
              });
            }
          });
        },
      });
    }

    return config;
  },
};

if (process.env.VERCEL !== '1') {
  config.output = 'standalone'; // Required for Docker builds
}

export default config;
