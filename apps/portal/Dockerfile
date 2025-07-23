# Use Node.js Alpine for smaller runtime image
FROM node:20-alpine AS runtime

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Copy the complete standalone build from CodeBuild
COPY .next/standalone ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# Use node to run the standalone server - handle monorepo structure
CMD ["sh", "-c", "if [ -f apps/portal/server.js ]; then node apps/portal/server.js; elif [ -f server.js ]; then node server.js; elif [ -f index.js ]; then node index.js; else echo 'No entry point found' && exit 1; fi"] 