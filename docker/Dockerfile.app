# Base image with Bun
FROM oven/bun:1-slim AS base
WORKDIR /app

# Install system dependencies and Node.js
FROM base AS deps
RUN apt update && apt install -y \
    curl \
    openssl \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js properly for better compatibility
ARG NODE_VERSION=20
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for dependency installation
FROM deps AS install
WORKDIR /app

# Create directory structure
RUN mkdir -p apps/app apps/framework-editor apps/portal apps/trust \
    packages/analytics packages/db packages/email packages/integrations \
    packages/kv packages/notifications packages/tsconfig packages/ui packages/utils

# Copy root package files
COPY package.json turbo.json ./
COPY bun.lockb* package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY .npmrc* ./

# Copy all package.json files
COPY apps/*/package.json ./apps/
COPY packages/*/package.json ./packages/

# Set environment variables for faster installs
ENV PRISMA_BINARIES_MIRROR=https://binaries.prisma.sh
ENV NODE_OPTIONS="--dns-result-order=ipv4first"
ENV HUSKY=0

# Install dependencies
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# Pre-download Prisma binaries
RUN cd packages/db && npx prisma version || true

# Builder stage
FROM deps AS builder
WORKDIR /app

# Copy dependencies
COPY --from=install /app/node_modules ./node_modules

# Copy source files
COPY . .

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Set dummy environment variables for build time
ENV AUTH_SECRET="dummy-auth-secret-for-build"
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ENV RESEND_API_KEY="dummy-resend-api-key"
ENV REVALIDATION_SECRET="dummy-revalidation-secret"
ENV NEXT_PUBLIC_PORTAL_URL="http://localhost:3002"

# Generate Prisma client with dummy DATABASE_URL using npx instead of bunx
RUN cd packages/db && DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy" npx prisma generate

# Add standalone output to next.config
RUN cd apps/app && \
    cp next.config.ts next.config.ts.bak && \
    sed -i 's/const config: NextConfig = {/const config: NextConfig = {\n  output: "standalone",/' next.config.ts

# Build the app (disable turbopack for compatibility)
RUN cd apps/app && \
    sed -i 's/"build": "next build --turbopack"/"build": "next build"/' package.json && \
    bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apt update && apt install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

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

# Note: Real environment variables should be provided at runtime via:
# docker run -e AUTH_SECRET=... -e DATABASE_URL=... etc.
# or via docker-compose.yml or kubernetes secrets

CMD ["node", "apps/app/server.js"]