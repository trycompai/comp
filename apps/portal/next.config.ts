import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.STATIC_ASSETS_URL : '',
  transpilePackages: ['@trycompai/db'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**/*': ['./prisma/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
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

// Always use standalone output
config.output = 'standalone';

export default config;
