import { withGTConfig } from 'gt-next/config';
import type { NextConfig } from 'next';
import './src/env.mjs';

const config: NextConfig = {
  // Use S3 bucket for static assets with app-specific path
  assetPrefix:
    process.env.NODE_ENV === 'production' && process.env.STATIC_ASSETS_URL
      ? `${process.env.STATIC_ASSETS_URL}/app`
      : '',
  reactStrictMode: true,
  transpilePackages: ['@trycompai/db'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
      allowedOrigins:
        process.env.NODE_ENV === 'production'
          ? ([process.env.NEXT_PUBLIC_PORTAL_URL, 'https://app.trycomp.ai'].filter(
              Boolean,
            ) as string[])
          : undefined,
    },
    authInterrupts: true,
    optimizePackageImports: ['@trycompai/db', '@trycompai/ui'],
  },

  // PostHog proxy for better tracking
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
};

export default withGTConfig(config, {});
