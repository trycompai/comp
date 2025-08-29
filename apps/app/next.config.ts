import type { NextConfig } from 'next';
import path from 'path';
import './src/env.mjs';

const isStandalone = process.env.NEXT_OUTPUT_STANDALONE === 'true';

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
    // Reduce build peak memory
    webpackMemoryOptimizations: true,
    // Ensure packages with native/wasm assets are externalized for RSC/Turbopack
    serverComponentsExternalPackages: ['@1password/sdk', '@1password/sdk-core'],
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Make sure the 1Password core WASM is included in the traced output
  outputFileTracingIncludes: {
    '/*': [path.join(__dirname, '../../node_modules/@1password/sdk-core/nodejs/core_bg.wasm')],
  },

  // Externalize on the server runtime as well (Next 15)
  serverExternalPackages: ['@1password/sdk', '@1password/sdk-core'],

  // Reduce memory usage during production build
  productionBrowserSourceMaps: false,
  // If builds still OOM, uncomment the next line to disable SWC minification (larger output, less memory)
  // swcMinify: false,
  ...(isStandalone
    ? {
        output: 'standalone' as const,
      }
    : {}),

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

export default config;
