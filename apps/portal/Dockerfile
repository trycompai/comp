# Use Node.js Alpine for smaller runtime image
FROM node:18-alpine AS runtime

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

# Copy the standalone build files (already prepared in container-build/)
COPY . ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# Use node to run the standalone server
CMD ["node", "server.js"] 