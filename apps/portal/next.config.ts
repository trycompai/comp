import type { NextConfig } from 'next';
import './src/env.mjs';

const config: NextConfig = {
  transpilePackages: ['@trycompai/db'],
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

if (process.env.VERCEL !== '1') {
  config.output = 'standalone';
}

export default config;
