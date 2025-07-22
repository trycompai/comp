# Pathfinder Infrastructure

This directory contains the Pulumi infrastructure code for deploying the Pathfinder app to AWS ECS Fargate.

## Structure

The infrastructure is kept separate from the main application to:

- Keep deployment dependencies isolated from runtime dependencies
- Reduce Docker image size by excluding infrastructure packages
- Allow independent versioning and updates

## Package Manager

**Note:** This directory uses `pnpm` instead of Bun because Pulumi doesn't support Bun as a package manager yet. The rest of the monorepo uses Bun.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   # or from the root directory:
   bun run infra:install
   ```

2. Configure AWS credentials:

   ```bash
   export AWS_PROFILE=your-profile
   # or
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   ```

3. Deploy:
   ```bash
   pulumi up
   # or from the root directory:
   bun run infra:up
   ```

## Available Commands

From the root directory:

- `bun run infra:install` - Install infrastructure dependencies
- `bun run infra:preview` - Preview infrastructure changes
- `bun run infra:up` - Deploy infrastructure
- `bun run infra:destroy` - Destroy infrastructure

## What Gets Deployed

- VPC with default configuration
- ECS Cluster
- Fargate Service with:
  - 2-10 instances (auto-scaling based on CPU)
  - Application Load Balancer
  - Docker image built from the root Dockerfile

## Troubleshooting

### Docker Build Issues

If you encounter issues during `pulumi up`:

1. **"Cannot connect to Docker daemon"**

   ```bash
   # Make sure Docker is running
   docker ps
   ```

2. **"No AWS credentials found"**

   ```bash
   # Configure AWS credentials
   aws configure
   # Or use environment variables:
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   ```

3. **"ECR authorization failed"**

   - Ensure your AWS user has ECR permissions
   - Check AWS region matches your config

4. **"Platform mismatch" warnings**
   - The `platform: "linux/amd64"` ensures compatibility
   - Ignore warnings if building on Apple Silicon

### Deployment Flow

1. `pulumi up` triggers the build
2. Docker builds the image locally
3. Image is pushed to ECR
4. ECS pulls from ECR when deploying
