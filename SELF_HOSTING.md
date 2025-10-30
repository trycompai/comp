## Self-hosting Comp (Apps + Portal)

This guide walks you through running the Comp app and portal with Docker.

### Overview

- You will run two services: `app` (primary) and `portal` (customer portal).
- You must bring your own externally hosted PostgreSQL database. The stack does not run a local DB in production mode.
- You must provide email (Resend) and Trigger.dev credentials for email login and automated workflows.

### Important: Multiple .env Files Required

This Docker setup requires **FOUR separate .env files** in different locations:

| File Location | Purpose | Key Variables |
|--------------|---------|---------------|
| `packages/db/.env` | Database migrations | `DATABASE_URL` |
| `apps/app/.env` | App runtime config | All app env vars |
| `apps/portal/.env` | Portal runtime config | All portal env vars |
| Root `.env` (optional) | Build-time args | `NEXT_PUBLIC_*` vars |

**Build-time vs Runtime:**
- **Build args** (NEXT_PUBLIC_*): Must be available during `docker compose build`
- **Runtime vars**: Loaded when containers start from service-specific .env files

See [Quick Setup Guide](#quick-setup-guide) below for step-by-step instructions.

### Prerequisites

- Docker Desktop (or Docker Engine) installed
- Externally hosted PostgreSQL 14+ (e.g., DigitalOcean, Neon, RDS) with SSL
- Resend account and API key for transactional email (magic links, OTP)
- Trigger.dev account and project for automated workflows

### Required Environment Variables

#### Build-Time Variables (Required Before `docker compose build`)

These **must** be available during build. Set them in your shell or create a root `.env` file:

**App Build Args:**
- `BETTER_AUTH_URL` - App base URL (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Same as above (client-side)
- `NEXT_PUBLIC_PORTAL_URL` - Portal URL (e.g., `http://localhost:3002`)
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics key (or empty string)
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host (or `/ingest`)
- `NEXT_PUBLIC_GTM_ID` - Google Tag Manager ID (or empty string)
- `NEXT_PUBLIC_IS_DUB_ENABLED` - Enable Dub.co features (`true`/`false`)
- `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` - LinkedIn partner ID (or empty string)
- `NEXT_PUBLIC_LINKEDIN_CONVERSION_ID` - LinkedIn conversion ID (or empty string)
- `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` - Google Ads label (or empty string)
- `NEXT_PUBLIC_API_URL` - API base URL (optional, defaults to same origin)

**Portal Build Args:**
- `BETTER_AUTH_URL_PORTAL` - Portal base URL (e.g., `http://localhost:3002`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Same as above (client-side)

#### Runtime Variables (Set in Service .env Files)

**`packages/db/.env` (for migrator/seeder):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

**`apps/app/.env` (for app service):**

**Authentication & Security (REQUIRED):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
AUTH_SECRET=                    # Generate with: openssl rand -base64 32
SECRET_KEY=                     # Generate with: openssl rand -base64 32 (for data encryption)
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
REVALIDATION_SECRET=            # Generate with: openssl rand -base64 32
```

**Email (REQUIRED):**
```bash
RESEND_API_KEY=                 # From https://resend.com/api-keys
```

**Background Jobs (REQUIRED):**
```bash
TRIGGER_SECRET_KEY=             # From https://cloud.trigger.dev project settings
```

**File Storage - AWS S3 (REQUIRED for attachments):**
```bash
APP_AWS_ACCESS_KEY_ID=
APP_AWS_SECRET_ACCESS_KEY=
APP_AWS_REGION=us-east-1
APP_AWS_BUCKET_NAME=comp-attachments
```

**OAuth Login (REQUIRED if using Google/GitHub login):**
```bash
AUTH_GOOGLE_ID=                 # From Google Cloud Console
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=                 # From GitHub OAuth Apps
AUTH_GITHUB_SECRET=
```

**AI Features (REQUIRED for AI chat/automation):**
```bash
OPENAI_API_KEY=                 # From https://platform.openai.com/api-keys
GROQ_API_KEY=                   # For dashboard AI chat
ANTHROPIC_API_KEY=              # Optional, for Claude models
```

**Portal URL (REQUIRED):**
```bash
NEXT_PUBLIC_PORTAL_URL=http://localhost:3002
```

**`apps/portal/.env` (for portal service):**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
BETTER_AUTH_SECRET=             # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3002
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3002
RESEND_API_KEY=                 # Same as app
```

### Optional Environment Variables

**`apps/app/.env`:**

**Rate Limiting & Caching:**
```bash
UPSTASH_REDIS_REST_URL=         # Upstash Redis for rate limiting
UPSTASH_REDIS_REST_TOKEN=
```

**Analytics & Tracking:**
```bash
NEXT_PUBLIC_POSTHOG_KEY=        # PostHog analytics
NEXT_PUBLIC_POSTHOG_HOST=/ingest
NEXT_PUBLIC_GTM_ID=             # Google Tag Manager
GA4_API_SECRET=                 # Google Analytics 4 server-side
GA4_MEASUREMENT_ID=             # Google Analytics 4 measurement ID
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=
LINKEDIN_CONVERSIONS_ACCESS_TOKEN=
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=
```

**Link Shortening:**
```bash
DUB_API_KEY=                    # Dub.co link shortener
DUB_REFER_URL=
NEXT_PUBLIC_IS_DUB_ENABLED=false
```

**Vendor Research:**
```bash
FIRECRAWL_API_KEY=              # For automated vendor research
```

**MDM Integration:**
```bash
FLEET_URL=                      # Fleet MDM integration
FLEET_TOKEN=
```

**Sales Notifications:**
```bash
SLACK_SALES_WEBHOOK=            # Slack webhook for sales notifications
```

**Vercel Integration (for custom domains):**
```bash
VERCEL_ACCESS_TOKEN=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=
TRUST_PORTAL_PROJECT_ID=
NEXT_PUBLIC_VERCEL_URL=
```

**Self-Hosted Trigger.dev (if not using cloud.trigger.dev):**
```bash
TRIGGER_API_KEY=                # For self-hosted Trigger.dev
TRIGGER_API_URL=                # For self-hosted Trigger.dev
```

**`apps/portal/.env`:**
```bash
UPSTASH_REDIS_REST_URL=         # Optional Redis for portal
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=        # Portal analytics
NEXT_PUBLIC_POSTHOG_HOST=/ingest
```

### Quick Setup Guide

#### Step 1: Create Environment Files

**Create `packages/db/.env`:**
```bash
cp packages/db/.env.example packages/db/.env
# Edit and set DATABASE_URL only
```

**Create `apps/app/.env`:**
```bash
cp apps/app/.env.example apps/app/.env
# Edit and set all REQUIRED variables listed above
```

**Create `apps/portal/.env`:**
```bash
cp apps/portal/.env.example apps/portal/.env
# Edit and set all REQUIRED variables listed above
```

**Create root `.env` (for build args):**
```bash
# Create this file at repository root
cat > .env << 'EOF'
# Build-time variables (loaded during docker compose build)
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_URL_PORTAL=http://localhost:3002
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_URL=http://localhost:3002

# Optional build-time analytics (set to empty string if not used)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=/ingest
NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_IS_DUB_ENABLED=false
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=
NEXT_PUBLIC_API_URL=
EOF
```

#### Step 2: Generate Secrets

```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Generate SECRET_KEY
openssl rand -base64 32

# Generate REVALIDATION_SECRET
openssl rand -base64 32

# Generate BETTER_AUTH_SECRET (for portal)
openssl rand -base64 32
```

Add these to the appropriate .env files.

#### Step 3: Setup External Services

**Resend (Email):**
1. Sign up at https://resend.com
2. Create API key: https://resend.com/api-keys
3. Set `RESEND_API_KEY` in both `apps/app/.env` and `apps/portal/.env`

**Trigger.dev (Background Jobs):**
1. Sign up at https://cloud.trigger.dev
2. Create a project
3. Copy `TRIGGER_SECRET_KEY` from project settings
4. Set in `apps/app/.env`

**AWS S3 (File Storage):**
1. Create AWS account or use existing
2. Create S3 bucket (e.g., `comp-attachments`)
3. Create IAM user with S3 permissions
4. Generate access key/secret
5. Set `APP_AWS_*` variables in `apps/app/.env`

**Google OAuth (Optional):**
1. Create project at https://console.cloud.google.com
2. Configure OAuth consent screen
3. Create OAuth 2.0 credentials
4. Set authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `apps/app/.env`

**GitHub OAuth (Optional):**
1. Create OAuth App at https://github.com/settings/developers
2. Set callback URL: `http://localhost:3000/api/auth/callback/github`
3. Set `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` in `apps/app/.env`

**OpenAI (AI Features):**
1. Create API key at https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY` in `apps/app/.env`

### Environment File Locations

**IMPORTANT:** Each service reads from a different .env file location:

- **migrator/seeder**: `packages/db/.env` (only needs DATABASE_URL)
- **app**: `apps/app/.env` (needs all app-specific variables)
- **portal**: `apps/portal/.env` (needs all portal-specific variables)

The docker-compose.yml configuration:

```yaml
services:
  migrator:
    env_file:
      - packages/db/.env

  app:
    build:
      args:
        NEXT_PUBLIC_BETTER_AUTH_URL: ${BETTER_AUTH_URL}
        # Note: Build args must be set from shell environment or root .env
    env_file:
      - apps/app/.env

  portal:
    build:
      args:
        NEXT_PUBLIC_BETTER_AUTH_URL: ${BETTER_AUTH_URL_PORTAL}
    env_file:
      - apps/portal/.env
```

**Build-time vs Runtime Variables:**

- **Build args** (NEXT_PUBLIC_*): Must be available during `docker compose build` - set these in your shell environment or root `.env` before building
- **Runtime variables**: Read from service-specific .env files when containers start

#### What the `migrator` and `seeder` services do

- **migrator**: Runs `prisma migrate deploy` using the combined schema from `@trycompai/db`.
  - Purpose: create/update tables, indexes, and constraints in your hosted Postgres.
  - Safe to run repeatedly (Prisma applies only pending migrations).

- **seeder**: Generates a Prisma client from the same combined schema and executes the app’s seed script.
  - Purpose: load application reference data (frameworks, controls, relations).
  - Behavior: idempotent upserts by `id`. It does not delete rows; existing rows with matching ids are updated, and relations are connected if missing.

Notes:

- The stack migrates with `@trycompai/db` combined Prisma schema and then seeds. Seeding is idempotent: records are upserted by id and relations are connected; nothing is deleted.
- Ensure your DB user has privileges to create/alter tables in the target database.

### Trigger.dev (Background Jobs) - REQUIRED

Trigger.dev powers AI automations and background workflows including:
- Automated vendor research
- Policy generation
- Risk assessment automation
- Scheduled compliance checks
- Evidence collection tasks

**Setup:**

1. Create an account at https://cloud.trigger.dev
2. Create a project and copy `TRIGGER_SECRET_KEY`
3. From your workstation (not inside Docker):
   ```bash
   cd apps/app
   bunx trigger.dev@latest login
   bunx trigger.dev@latest deploy
   ```
4. Set `TRIGGER_SECRET_KEY` in `apps/app/.env`

**Important Notes:**
- Set `TRIGGER_SECRET_KEY` in `apps/app/.env` (NOT root .env)
- Without Trigger.dev, background jobs and automations will not work
- You must deploy tasks before they can run (use `bunx trigger.dev@latest deploy` from `apps/app/`)
- For self-hosting Trigger.dev (advanced), set `TRIGGER_API_KEY` and `TRIGGER_API_URL` instead

### Resend (Email) - REQUIRED

**Email is required for:**
- Magic link authentication
- OTP codes
- Task notifications
- Audit reports
- User invitations

**Setup:**
1. Create a Resend account at https://resend.com
2. Create API key at https://resend.com/api-keys
3. (Optional) Add custom domain for production email sending
4. Set `RESEND_API_KEY` in **both** `apps/app/.env` and `apps/portal/.env`

**Without Resend:** Authentication will fail and users cannot log in.

### AWS S3 (File Storage) - REQUIRED

**File attachments are required for:**
- Task evidence uploads
- Policy document uploads
- Vendor security questionnaires
- Audit evidence collection

**Setup:**

1. Create AWS account or use existing

2. Create S3 bucket:
   ```bash
   aws s3 mb s3://comp-attachments --region us-east-1
   ```

3. Configure bucket CORS (to allow uploads from your domain):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

4. Create IAM user with S3 policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::comp-attachments/*"
       }
     ]
   }
   ```

5. Generate access key/secret for IAM user

6. Set in `apps/app/.env`:
   ```bash
   APP_AWS_ACCESS_KEY_ID=<your-access-key>
   APP_AWS_SECRET_ACCESS_KEY=<your-secret-key>
   APP_AWS_REGION=us-east-1
   APP_AWS_BUCKET_NAME=comp-attachments
   ```

**Without S3:** File uploads will fail and evidence collection features will not work.

### Build & run

#### Prepare Environment

**You must create 4 separate .env files:**

```bash
# 1. Database migrations
cp packages/db/.env.example packages/db/.env
# Edit packages/db/.env and set DATABASE_URL

# 2. App runtime
cp apps/app/.env.example apps/app/.env
# Edit apps/app/.env and set all REQUIRED variables (see above)

# 3. Portal runtime
cp apps/portal/.env.example apps/portal/.env
# Edit apps/portal/.env and set all REQUIRED variables (see above)

# 4. Build-time variables (at repository root)
# Create root .env with build args (see Quick Setup Guide above)
```

**Verify all required secrets are set:**
```bash
# Should be set in appropriate .env files:
# - AUTH_SECRET (apps/app/.env)
# - SECRET_KEY (apps/app/.env)
# - REVALIDATION_SECRET (apps/app/.env)
# - BETTER_AUTH_SECRET (apps/portal/.env)
# - RESEND_API_KEY (both app and portal)
# - TRIGGER_SECRET_KEY (apps/app/.env)
# - DATABASE_URL (all three .env files)
# - AWS S3 credentials (apps/app/.env)
```

#### Fresh install (optional clean):

```bash
docker compose down --rmi all --volumes --remove-orphans
docker builder prune --all --force
```

#### Build images:

```bash
docker compose build --no-cache
```

#### Run migrations & seed (against your hosted DB):

```bash
docker compose run --rm migrator
docker compose run --rm seeder
```

#### Start the apps:

```bash
docker compose up -d app portal
```

Verify health:

```bash
curl -s http://localhost:3000/api/health
```

### Production tips

- Set real domains and HTTPS (behind a reverse proxy / load balancer)
- Update `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`, and portal equivalents to the public domains
- Use strong secrets and rotate them periodically
- Ensure the hosted Postgres requires SSL and restricts network access (VPC, IP allowlist, or private networking)
- Ensure all build args are set in your CI/CD environment before `docker compose build`
- Use separate S3 buckets for production/staging
- Enable S3 bucket versioning for audit compliance
- Use AWS IAM roles instead of access keys when deploying to EC2/ECS
- Consider using AWS Secrets Manager for sensitive environment variables
- Monitor Trigger.dev task execution and set up alerts for failures
- Set up database backups with point-in-time recovery
- Use a CDN (CloudFront, Cloudflare) in front of your app for better performance
- Update CORS configuration in S3 to allow your production domain
- Regularly update dependencies and Docker images for security patches
