import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets
  assetPrefix:
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.STATIC_ASSETS_BUCKET}.s3.amazonaws.com`
      : '',
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
