import type { NextConfig } from "next";
import path from "path";

import { withBotId } from "botid/next/config";

import "./src/env.mjs";

const isStandalone = process.env.NEXT_OUTPUT_STANDALONE === "true";

const config: NextConfig = {
  // Ensure Turbopack can import .md files as raw strings during dev
  turbopack: {
    root: path.join(__dirname, "..", ".."),
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    // Enable importing .md files as raw strings during webpack builds
    config.module = config.module || { rules: [] };
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });

    return config;
  },
  // Use S3 bucket for static assets with app-specific path
  assetPrefix:
    process.env.NODE_ENV === "production" && process.env.STATIC_ASSETS_URL
      ? `${process.env.STATIC_ASSETS_URL}/app`
      : "",
  reactStrictMode: false,
  transpilePackages: ["@trycompai/ui", "@trycompai/email"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
      allowedOrigins:
        process.env.NODE_ENV === "production"
          ? ([
              process.env.NEXT_PUBLIC_PORTAL_URL,
              "https://app.trycomp.ai",
            ].filter(Boolean) as string[])
          : undefined,
    },
    authInterrupts: true,
    // Reduce build peak memory
    webpackMemoryOptimizations: true,
  },
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Reduce memory usage during production build
  productionBrowserSourceMaps: false,
  // If builds still OOM, uncomment the next line to disable SWC minification (larger output, less memory)
  // swcMinify: false,
  ...(isStandalone
    ? {
        output: "standalone" as const,
      }
    : {}),

  // PostHog proxy for better tracking
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
};

export default withBotId(config);
