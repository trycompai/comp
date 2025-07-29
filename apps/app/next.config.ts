import type { NextConfig } from 'next';
import './src/env.mjs';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@trycompai/db'],
  env: {
    // Tell Prisma where to find binaries from the published package
    PRISMA_QUERY_ENGINE_LIBRARY: process.env.VERCEL
      ? '/vercel/path0/apps/app/node_modules/@trycompai/db/dist/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node'
      : undefined,
  },
  // Backup: Install the official Prisma monorepo plugin if env variable doesn't work
  // Run: bun add @prisma/nextjs-monorepo-workaround-plugin --dev
  // Then uncomment the webpack section below:

  // webpack: (config, { isServer }) => {
  //   if (isServer) {
  //     config.plugins.push(new (require('@prisma/nextjs-monorepo-workaround-plugin'))())
  //   }
  //   return config
  // },
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
};

if (process.env.VERCEL !== '1') {
  config.output = 'standalone'; // Required for Docker builds
}

export default config;
