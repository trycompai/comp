import { withBotId } from 'botid/next/config';
import type { NextConfig } from 'next';
import path from 'path';

import './src/env.mjs';

const isStandalone = process.env.NEXT_OUTPUT_STANDALONE === 'true';

const workspaceRoot = path.join(__dirname, '..', '..');

const config: NextConfig = {
  // Ensure Turbopack can import .md files as raw strings during dev
  turbopack: {
    root: workspaceRoot,
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },

  webpack: (config) => {
    // Enable importing .md files as raw strings during webpack builds
    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });

    return config;
  },
  // Use S3 bucket for static assets with app-specific path
  assetPrefix:
    process.env.NODE_ENV === 'production' && process.env.STATIC_ASSETS_URL
      ? `${process.env.STATIC_ASSETS_URL}/app`
      : '',
  reactStrictMode: false,
  transpilePackages: [
    '@trycompai/auth',
    '@trycompai/db',
    '@trycompai/design-system',
    '@trycompai/ui',
    '@carbon/icons-react',
    '@trycompai/company',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  serverExternalPackages: ['jspdf'],

  experimental: {
    serverActions: {
      // NOTE: Attachment uploads may be sent as base64 strings, which increases payload size.
      // Keep this above the user-facing max file size.
      bodySizeLimit: '150mb',
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
  },
  outputFileTracingRoot: workspaceRoot,

  // Reduce memory usage during production build
  productionBrowserSourceMaps: false,
  // If builds still OOM, uncomment the next line to disable SWC minification (larger output, less memory)
  // swcMinify: false,
  ...(isStandalone
    ? {
        output: 'standalone' as const,
      }
    : {}),

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
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

export default withBotId(config);
