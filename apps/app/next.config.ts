import type { NextConfig } from 'next';
import * as path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      underscore: 'lodash',
    },
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**/*': [
      '../../packages/db/generated/prisma/**/*',
      '../../packages/db/generated/prisma/libquery_engine-*.node',
    ],
    '/**/*': [
      '../../packages/db/generated/prisma/**/*',
      '../../packages/db/generated/prisma/libquery_engine-*.node',
    ],
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
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure Prisma binaries are copied
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
        '../generated/prisma': 'commonjs ../generated/prisma',
      });
    }
    return config;
  },
};

if (process.env.VERCEL !== '1') {
  config.output = 'standalone'; // Required for Docker builds
}

export default config;
