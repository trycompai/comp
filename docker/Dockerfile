# Base image with Bun
FROM oven/bun:1.1.36-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json ./
COPY .npmrc* ./
COPY apps/app/package.json ./apps/app/
COPY apps/framework-editor/package.json ./apps/framework-editor/
COPY apps/portal/package.json ./apps/portal/
COPY apps/trust/package.json ./apps/trust/
# Copy all package directories with their package.json files
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/kv/package.json ./packages/kv/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY turbo.json ./

# Set Prisma binary targets for Alpine Linux
ENV PRISMA_BINARIES_MIRROR=https://binaries.prisma.sh

# Network optimization environment variables
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV BUN_CONFIG_PREFER_OFFLINE=1
ENV BUN_CONFIG_PREFER_LATEST=0
ENV BUN_CONFIG_MAX_RETRIES=3
ENV BUN_CONFIG_TIMEOUT=30000

# Install dependencies with reduced concurrency
RUN bun install --concurrent-scripts=1

# Builder stage
FROM base AS builder
RUN apk add --no-cache git
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client - no database needed for generation
ENV PRISMA_BINARIES_MIRROR=https://binaries.prisma.sh
RUN cd packages/db && bunx prisma generate && cd ../..

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV TURBO_TELEMETRY_DISABLED=1

# Ensure all dependencies are installed before build
# Use cache mount to speed up subsequent builds
# Skip husky installation in Docker build
ENV HUSKY=0
RUN --mount=type=cache,target=/root/.bun/install/cache \
    cd /app && bun install --no-save

# Create a new next.config to ignore type errors and enable standalone output
RUN cd /app/apps/app && \
    echo "import type { NextConfig } from 'next';" > next.config.prod.ts && \
    echo "const config: NextConfig = {" >> next.config.prod.ts && \
    echo "  output: 'standalone'," >> next.config.prod.ts && \
    echo "  typescript: { ignoreBuildErrors: true }," >> next.config.prod.ts && \
    echo "  eslint: { ignoreDuringBuilds: true }," >> next.config.prod.ts && \
    echo "  poweredByHeader: false," >> next.config.prod.ts && \
    echo "  reactStrictMode: true," >> next.config.prod.ts && \
    echo "  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] }," >> next.config.prod.ts && \
    echo "  transpilePackages: ['@comp/ui']," >> next.config.prod.ts && \
    echo "  experimental: { serverActions: { bodySizeLimit: '15mb' }, authInterrupts: true }," >> next.config.prod.ts && \
    echo "};" >> next.config.prod.ts && \
    echo "export default config;" >> next.config.prod.ts && \
    mv next.config.ts next.config.ts.original && \
    mv next.config.prod.ts next.config.ts

# Build the app directly in the app directory
RUN cd /app/apps/app && bun run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/app/public ./apps/app/public

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "apps/app/server.js"]