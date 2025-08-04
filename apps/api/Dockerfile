# Stage 1: Builder
FROM oven/bun:1.1.17-alpine AS builder

WORKDIR /app

# Copy package.json and bun.lock to leverage Bun's caching
COPY package.json bun.lock ./

# Copy all package.json files for workspace resolution
COPY apps/api/package.json ./apps/api/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/db/package.json ./packages/db/
COPY packages/email/package.json ./packages/email/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/kv/package.json ./packages/kv/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/db/prisma packages/db/prisma/

# Install all dependencies (including devDependencies for building)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN cd packages/db && bun x prisma generate && cd ../../

# Build NestJS application
RUN cd apps/api && bun run build && cd ../../

# Install production dependencies only for the final image
RUN bun install --frozen-lockfile --production

# Stage 2: Production
FROM oven/bun:1.1.17-alpine

# Install wget for health check
RUN apk add --no-cache wget

WORKDIR /app

# Copy only necessary files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3333

# Create a non-root user for security
RUN addgroup --system nestjs && adduser --system --ingroup nestjs nestjs
USER nestjs

# Expose the port the app runs on
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/v1/health || exit 1

# Start the application
CMD ["node", "apps/api/dist/main.js"]