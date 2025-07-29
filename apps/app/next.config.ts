import type { NextConfig } from 'next';
import './src/env.mjs';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@trycompai/db'],
  env: {
    // Fix for Vercel deployment with published @trycompai/db package:
    // 1. Use binary engine (more compatible with serverless than library engine)
    PRISMA_CLIENT_ENGINE_TYPE: 'binary',
    // 2. Point directly to binary location in published package (Vercel only)
    PRISMA_QUERY_ENGINE_BINARY: process.env.VERCEL 
      ? '/vercel/path0/apps/app/node_modules/@trycompai/db/dist/generated/prisma/query-engine-rhel-openssl-3.0.x'
      : undefined,
  },
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
