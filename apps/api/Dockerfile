# Use Node.js runtime for production
FROM node:20-alpine

# Install wget for health check
RUN apk add --no-cache wget

WORKDIR /app

# Copy the entire pre-built bundle (no dependencies needed)
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3333

# Create a non-root user for security
RUN addgroup --system nestjs && adduser --system --ingroup nestjs nestjs

# Change ownership to nestjs user
RUN chown -R nestjs:nestjs /app

USER nestjs

# Expose the port the app runs on
EXPOSE 3333

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/v1/health || exit 1

# Start the application
CMD ["node", "src/main.js"]