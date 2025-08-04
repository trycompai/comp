import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets with portal-specific path
  assetPrefix:
    process.env.NODE_ENV === 'production' ? `${process.env.STATIC_ASSETS_URL}/portal` : '',
  transpilePackages: ['@trycompai/db'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/**/*': ['./src/actions/**/*', './node_modules/.prisma/client/**/*'],
  },
  generateEtags: false,
  experimental: {
    serverActions: {
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXT_PUBLIC_BETTER_AUTH_URL].filter(Boolean) as string[]
        : undefined,
    },
    optimizePackageImports: ['@trycompai/db'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    if (process.env.NODE_ENV === 'production' && process.env.STATIC_ASSETS_URL) {
      return [
        {
          source: '/favicon.ico',
          destination: `${process.env.STATIC_ASSETS_URL}/portal/favicon.ico`,
          permanent: true,
        },
        {
          source: '/favicon-96x96.png',
          destination: `${process.env.STATIC_ASSETS_URL}/portal/favicon-96x96.png`,
          permanent: true,
        },
        {
          source: '/apple-touch-icon.png',
          destination: `${process.env.STATIC_ASSETS_URL}/portal/apple-touch-icon.png`,
          permanent: true,
        },
        {
          source: '/site.webmanifest',
          destination: `${process.env.STATIC_ASSETS_URL}/portal/site.webmanifest`,
          permanent: true,
        },
      ];
    }
    return [];
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
};

// Always use standalone output
config.output = 'standalone';

export default config;
