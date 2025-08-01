# =============================================================================
# STAGE 1: Dependencies - Install and cache workspace dependencies
# =============================================================================
FROM oven/bun:1.2.8 AS deps

WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lock ./

# Copy package.json files for all packages
COPY packages/db/package.json ./packages/db/
COPY packages/kv/package.json ./packages/kv/
COPY packages/ui/package.json ./packages/ui/
COPY packages/email/package.json ./packages/email/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/analytics/package.json ./packages/analytics/

# Copy app package.json files
COPY apps/app/package.json ./apps/app/
COPY apps/portal/package.json ./apps/portal/

# Install all dependencies
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true bun install --frozen-lockfile

# =============================================================================
# STAGE 2: Ultra-Minimal Migrator - Only Prisma
# =============================================================================
FROM oven/bun:1.2.8 AS migrator

WORKDIR /app

# Copy Prisma schema and migration files
COPY packages/db/prisma ./packages/db/prisma

# Create minimal package.json for Prisma
RUN echo '{"name":"migrator","type":"module","dependencies":{"prisma":"^6.13.0","@prisma/client":"^6.13.0"}}' > package.json

# Install ONLY Prisma dependencies
RUN bun install

# Generate Prisma client
RUN cd packages/db && bunx prisma generate

# Default command for migrations
CMD ["bunx", "prisma", "migrate", "deploy", "--schema=packages/db/prisma/schema.prisma"]

# =============================================================================
# STAGE 3: App Builder
# =============================================================================
FROM deps AS app-builder

WORKDIR /app

# Copy all source code needed for build
COPY packages ./packages
COPY apps/app ./apps/app

# Generate Prisma client in the full workspace context
RUN cd packages/db && bunx prisma generate

# Build the app
RUN cd apps/app && SKIP_ENV_VALIDATION=true bun run build

# =============================================================================
# STAGE 4: App Production
# =============================================================================
FROM oven/bun:1.2.8 AS app

WORKDIR /app

# Copy the built app and all necessary dependencies from builder
COPY --from=app-builder /app/apps/app/.next ./apps/app/.next
COPY --from=app-builder /app/apps/app/package.json ./apps/app/
COPY --from=app-builder /app/package.json ./
COPY --from=app-builder /app/node_modules ./node_modules
COPY --from=app-builder /app/packages ./packages

EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/app", "start"]

# =============================================================================
# STAGE 5: Portal Builder
# =============================================================================
FROM deps AS portal-builder

WORKDIR /app

# Copy all source code needed for build
COPY packages ./packages
COPY apps/portal ./apps/portal

# Generate Prisma client
RUN cd packages/db && bunx prisma generate

# Build the portal
RUN cd apps/portal && SKIP_ENV_VALIDATION=true bun run build

# =============================================================================
# STAGE 6: Portal Production
# =============================================================================
FROM oven/bun:1.2.8 AS portal

WORKDIR /app

# Copy the built portal and all necessary dependencies from builder
COPY --from=portal-builder /app/apps/portal/.next ./apps/portal/.next
COPY --from=portal-builder /app/apps/portal/package.json ./apps/portal/
COPY --from=portal-builder /app/package.json ./
COPY --from=portal-builder /app/node_modules ./node_modules
COPY --from=portal-builder /app/packages ./packages

EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/portal", "start"] 