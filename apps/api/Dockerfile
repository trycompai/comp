# Use Node.js runtime for production
FROM node:20-alpine

# Install required packages (wget for healthcheck, curl/bash for bun install, libc compat for prisma)
RUN apk add --no-cache wget curl bash libc6-compat openssl

WORKDIR /app

# Copy package.json and pre-installed node_modules from buildspec
COPY package.json ./
COPY node_modules ./node_modules

# Copy built application and prisma files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3333

# Create a non-root user for security
RUN addgroup --system nestjs && adduser --system --ingroup nestjs nestjs \
  && chown -R nestjs:nestjs /app

USER nestjs

# Expose the port the app runs on
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/v1/health || exit 1

# Start the application
CMD ["node", "src/main.js"]