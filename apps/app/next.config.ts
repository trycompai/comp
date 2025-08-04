import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets with app-specific path
  assetPrefix: process.env.NODE_ENV === 'production' ? `${process.env.STATIC_ASSETS_URL}/app` : '',
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
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  async headers() {
    return [
      {
        // Super permissive CORS for all API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-pathname',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async redirects() {
    if (process.env.NODE_ENV === 'production' && process.env.STATIC_ASSETS_URL) {
      return [
        {
          source: '/favicon.ico',
          destination: `${process.env.STATIC_ASSETS_URL}/app/favicon.ico`,
          permanent: true,
        },
        {
          source: '/favicon-96x96.png',
          destination: `${process.env.STATIC_ASSETS_URL}/app/favicon-96x96.png`,
          permanent: true,
        },
        {
          source: '/apple-touch-icon.png',
          destination: `${process.env.STATIC_ASSETS_URL}/app/apple-touch-icon.png`,
          permanent: true,
        },
        {
          source: '/site.webmanifest',
          destination: `${process.env.STATIC_ASSETS_URL}/app/site.webmanifest`,
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
  skipTrailingSlashRedirect: true,
};

// Always use standalone output
config.output = 'standalone';

export default config;
