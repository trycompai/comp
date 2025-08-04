# Use Node.js 20 Alpine as base image
FROM node:20-alpine AS base

# Install necessary packages for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy built application from buildspec
COPY dist/ ./
COPY package.json ./

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Change ownership of the app directory to the nestjs user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose the port the app runs on
EXPOSE 3333

# Health check  
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/v1/health || exit 1

# Start the application
CMD ["node", "main.js"]