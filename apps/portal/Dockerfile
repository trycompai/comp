# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/portal/package*.json ./apps/portal/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the portal app
RUN npm run build --workspace=apps/portal

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/portal/.next ./apps/portal/.next
COPY --from=builder /app/apps/portal/public ./apps/portal/public
COPY --from=builder /app/apps/portal/package.json ./apps/portal/package.json

# Set environment to production
ENV NODE_ENV=production

# Expose the port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start", "--workspace=apps/portal"] 