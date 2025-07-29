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
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
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
