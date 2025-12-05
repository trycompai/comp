## Self-hosting Comp (Apps + Portal)

This guide walks you through running the Comp app and portal with Docker.

### Overview

- You will run two services: `app` (primary) and `portal` (customer portal).
- You must bring your own externally hosted PostgreSQL database. The stack does not run a local DB in production mode.
- You must provide email (Resend) and Trigger.dev credentials for email login and automated workflows.

### Prerequisites

- Docker Desktop (or Docker Engine) installed
- Externally hosted PostgreSQL 14+ (e.g., DigitalOcean, Neon, RDS) with SSL
- Resend account and API key for transactional email (magic links, OTP)
- Trigger.dev account and project for automated workflows

### Required environment variables

Set these in `docker-compose.yml` under each service as shown below.

App (`apps/app`):

- `DATABASE_URL` (required): External Postgres URL. Example: `postgresql://user:pass@host:5432/db?sslmode=require`
- `AUTH_SECRET` (required): 32-byte base64. Generate with `openssl rand -base64 32`
- `RESEND_API_KEY` (required): From Resend dashboard
- `REVALIDATION_SECRET` (required): Any random string
- `BETTER_AUTH_URL` (required): Base URL of the app server (e.g., `http://localhost:3000`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` (required): Same as above for client code
- `NEXT_PUBLIC_PORTAL_URL` (required): Base URL of the portal server (e.g., `http://localhost:3002`)
- `TRIGGER_SECRET_KEY` (required for workflows): From Trigger.dev project settings
- Optional (infrastructure): `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Portal (`apps/portal`):

- `DATABASE_URL` (required): Same external Postgres URL
- `BETTER_AUTH_SECRET` (required): A secret used by portal auth (distinct from app `AUTH_SECRET`)
- `BETTER_AUTH_URL` (required): Base URL of the portal (e.g., `http://localhost:3002`)
- `NEXT_PUBLIC_BETTER_AUTH_URL` (required): Same as portal base URL for client code
- `RESEND_API_KEY` (required): Same Resend key

### Optional environment variables

App (`apps/app`):

- **APP_AWS_REGION**, **APP_AWS_ACCESS_KEY_ID**, **APP_AWS_SECRET_ACCESS_KEY**, **APP_AWS_BUCKET_NAME**: AWS S3 credentials for file storage (attachments, general uploads).
- **APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET**: AWS S3 bucket name specifically for questionnaire file uploads. Required for the Security Questionnaire feature. If not set, users will see an error when trying to parse questionnaires.
- **APP_AWS_KNOWLEDGE_BASE_BUCKET**: AWS S3 bucket name specifically for knowledge base documents. Required for the Knowledge Base feature in Security Questionnaire. If not set, users will see an error when trying to upload knowledge base documents.
- **APP_AWS_ORG_ASSETS_BUCKET**: AWS S3 bucket name for organization static assets (e.g., company logos, compliance certificates). Required for logo uploads in organization settings and Trust Portal compliance certificate uploads. If not set, these features will fail.
- **OPENAI_API_KEY**: Enables AI features that call OpenAI models.
- **UPSTASH_REDIS_REST_URL**, **UPSTASH_REDIS_REST_TOKEN**: Optional Redis (Upstash) used for rate limiting/queues/caching.
- **NEXT_PUBLIC_POSTHOG_KEY**, **NEXT_PUBLIC_POSTHOG_HOST**: Client analytics via PostHog; leave unset to disable.
- **NEXT_PUBLIC_GTM_ID**: Google Tag Manager container ID for client tracking.
- **NEXT_PUBLIC_LINKEDIN_PARTNER_ID**, **NEXT_PUBLIC_LINKEDIN_CONVERSION_ID**: LinkedIn insights/conversion tracking.
- **NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL**: Google Ads conversion tracking label.
- **DUB_API_KEY**, **DUB_REFER_URL**: Dub.co link shortener/referral features.
- **FIRECRAWL_API_KEY**: Optional LLM/crawling providers for research features.
- **SLACK_SALES_WEBHOOK**: Slack webhook for sales/lead notifications.
- **HUBSPOT_API_KEY**: HubSpot API key for fetching sales metrics (demos, pipeline, ARR, email stats).
- **GA4_API_SECRET**, **GA4_MEASUREMENT_ID**: Google Analytics 4 server/client tracking.
- **NEXT_PUBLIC_API_URL**: Override client API base URL (defaults to same origin).

API (`apps/api`):

- **APP_AWS_REGION**, **APP_AWS_ACCESS_KEY_ID**, **APP_AWS_SECRET_ACCESS_KEY**, **APP_AWS_BUCKET_NAME**: AWS S3 credentials for file storage (attachments, general uploads).
- **APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET**: AWS S3 bucket name specifically for questionnaire file uploads. Required for the Security Questionnaire feature.
- **APP_AWS_KNOWLEDGE_BASE_BUCKET**: AWS S3 bucket name specifically for knowledge base documents. Required for the Knowledge Base feature in Security Questionnaire.
- **APP_AWS_ORG_ASSETS_BUCKET**: AWS S3 bucket name for organization static assets (e.g., company logos, compliance certificates). Required for Trust Portal compliance certificate uploads and organization logo uploads. If not set, these features will fail.
- **OPENAI_API_KEY**: Enables AI features that call OpenAI models.
- **UPSTASH_VECTOR_REST_URL**, **UPSTASH_VECTOR_REST_TOKEN**: Required for vector database operations (questionnaire auto-answer, SOA auto-fill, knowledge base search).
- **BETTER_AUTH_URL**: URL of the Better Auth instance (usually the same as the app URL).
- **DATABASE_URL**: PostgreSQL database connection string.

Portal (`apps/portal`):

- **NEXT_PUBLIC_POSTHOG_KEY**, **NEXT_PUBLIC_POSTHOG_HOST**: Client analytics via PostHog for portal.
- **UPSTASH_REDIS_REST_URL**, **UPSTASH_REDIS_REST_TOKEN**: Optional Redis if you enable portal-side rate limiting/queues.

### docker-compose.yml uses `.env` (no direct edits needed)

We keep `docker-compose.yml` generic and read values from `.env`:

```yaml
services:
  migrator:
    build:
      context: .
      dockerfile: Dockerfile
      target: migrator
    env_file:
      - .env

  seeder:
    build:
      context: .
      dockerfile: Dockerfile
      target: migrator
    env_file:
      - .env
    command: sh -lc "bunx prisma generate --schema=node_modules/@trycompai/db/dist/schema.prisma && bun packages/db/prisma/seed/seed.js"

  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: app
      args:
        NEXT_PUBLIC_BETTER_AUTH_URL: ${BETTER_AUTH_URL}
    ports: ['3000:3000']
    env_file: [.env]
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3000/api/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3

  portal:
    build:
      context: .
      dockerfile: Dockerfile
      target: portal
      args:
        NEXT_PUBLIC_BETTER_AUTH_URL: ${BETTER_AUTH_URL_PORTAL}
    ports: ['3002:3000']
    env_file: [.env]
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:3002/ || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
```

#### `.env` example

Create a `.env` file at the repo root with your values (never commit real secrets):

```bash
# External PostgreSQL (required)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# App auth + URLs (required)
AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_URL=http://localhost:3002
REVALIDATION_SECRET=

# Email (required)
RESEND_API_KEY=

# Workflows (Trigger.dev hosted)
TRIGGER_SECRET_KEY=

# Portal auth + URLs (required)
BETTER_AUTH_SECRET=
BETTER_AUTH_URL_PORTAL=http://localhost:3002
NEXT_PUBLIC_BETTER_AUTH_URL_PORTAL=http://localhost:3002

# Optional
# AWS S3 (for file storage)
# APP_AWS_REGION=
# APP_AWS_ACCESS_KEY_ID=
# APP_AWS_SECRET_ACCESS_KEY=
# APP_AWS_BUCKET_NAME=
# APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET=
# APP_AWS_KNOWLEDGE_BASE_BUCKET=
# APP_AWS_ORG_ASSETS_BUCKET=
# OPENAI_API_KEY=
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# NEXT_PUBLIC_POSTHOG_KEY=
# NEXT_PUBLIC_POSTHOG_HOST=
# NEXT_PUBLIC_GTM_ID=
# NEXT_PUBLIC_LINKEDIN_PARTNER_ID=
# NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=
# NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=
# DUB_API_KEY=
# DUB_REFER_URL=
# FIRECRAWL_API_KEY=
# SLACK_SALES_WEBHOOK=
# HUBSPOT_API_KEY=
# GA4_API_SECRET=
# GA4_MEASUREMENT_ID=
# NEXT_PUBLIC_API_URL=
```

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

### Trigger.dev (hosted runner)

Trigger.dev powers AI automations and background workflows.

Steps:

1. Create an account at `https://cloud.trigger.dev`
2. Create a project and copy `TRIGGER_SECRET_KEY`
3. From your workstation (not inside Docker):
   ```bash
   cd apps/app
   bunx trigger.dev@latest login
   bunx trigger.dev@latest deploy
   ```
4. Set `TRIGGER_SECRET_KEY` in the `app` service environment.

### Resend (email)

- Create a Resend account and get `RESEND_API_KEY`
- Add a domain if you plan to send emails from a custom domain
- Set `RESEND_API_KEY` in both `app` and `portal` services

### Build & run

#### Prepare environment

Copy the example and fill real values (kept out of git):

```bash
cp .env.example .env
# edit .env with your production secrets and URLs
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
