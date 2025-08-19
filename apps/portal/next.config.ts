import path from 'path';
import './src/env.mjs';

const isStandalone = process.env.NEXT_OUTPUT_STANDALONE === 'true';

const config = {
  transpilePackages: ['@trycompai/db'],
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
  async headers() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'Next-Action',
          },
        ],
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  ...(isStandalone
    ? {
        output: 'standalone' as const,
      }
    : {}),
};

export default config;
