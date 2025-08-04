import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.STATIC_ASSETS_BUCKET}.s3.amazonaws.com`
      : '',
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
  async rewrites() {
    const rewrites = [
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

    // In production, redirect public assets to S3
    if (process.env.NODE_ENV === 'production' && process.env.STATIC_ASSETS_BUCKET) {
      // Add individual rewrites for common static file types
      const staticExtensions = [
        'ico',
        'png',
        'jpg',
        'jpeg',
        'gif',
        'svg',
        'webp',
        'woff',
        'woff2',
        'ttf',
        'eot',
        'otf',
        'mp3',
        'mp4',
        'webm',
        'pdf',
      ];
      staticExtensions.forEach((ext) => {
        rewrites.push({
          source: `/:path*.${ext}`,
          destination: `https://${process.env.STATIC_ASSETS_BUCKET}.s3.amazonaws.com/:path*.${ext}`,
        });
      });
    }

    return rewrites;
  },
  skipTrailingSlashRedirect: true,
};

// Always use standalone output
config.output = 'standalone';

export default config;
