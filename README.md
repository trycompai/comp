<div align="center">
  <a href="https://trycomp.ai">
    <img src="https://assets.trycomp.ai/logo.png" width="80" alt="Comp AI logo" />
  </a>
  <h1>Comp AI</h1>
  <p><strong>The agentic compliance platform.</strong></p>
  <p>Get SOC 2 and ISO 27001 audit-ready in record time, backed by enterprise-grade cybersecurity.</p>

  <p>
    <a href="https://www.producthunt.com/products/comp-ai-get-soc-2-iso-27001-gdpr/launches/comp-ai"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-DA552E" alt="Product Hunt" /></a>
    <a href="https://github.com/trycompai/comp/stargazers"><img src="https://img.shields.io/github/stars/trycompai/comp" alt="GitHub Stars" /></a>
    <a href="https://github.com/trycompai/comp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-purple" alt="License" /></a>
    <a href="https://github.com/trycompai/comp/pulse"><img src="https://img.shields.io/github/commit-activity/m/trycompai/comp" alt="Commits per month" /></a>
  </p>

  <p>
    <a href="https://trycomp.ai">Website</a> ·
    <a href="https://trycomp.ai/docs">Docs</a> ·
    <a href="https://discord.gg/compai">Discord</a> ·
    <a href="https://roadmap.trycomp.ai/roadmap">Roadmap</a> ·
    <a href="https://github.com/trycompai/comp/issues">Issues</a>
  </p>
</div>

## Overview

Comp AI automates compliance end-to-end: AI agents collect evidence from 500+ integrations, generate policies from your business context, and continuously monitor your security posture — all from a single, open-source platform.

- `apps/app` — main web app (Next.js 16, port `3000`)
- `apps/api` — backend API (NestJS, port `3001`)
- `apps/portal` — customer portal (Next.js 16, port `3002`)
- `apps/docs` — documentation site

## Contents

- [Quick start](#quick-start)
- [Monorepo layout](#monorepo-layout)
- [Run commands](#run-commands)
- [Environment setup](#environment-setup)
- [Database](#database)
- [Package publishing](#package-publishing)
- [Contributing](#contributing)
- [License](#license)

## Quick start

### Prerequisites

- Node.js `>=20`
- Bun `>=1.1.36`
- Docker (for Postgres)

### Bootstrap

```bash
git clone https://github.com/trycompai/comp.git
cd comp
bun install

# Copy env files
cp apps/app/.env.example apps/app/.env
cp apps/portal/.env.example apps/portal/.env
cp packages/db/.env.example packages/db/.env

# Start database
cd packages/db
bun run docker:up
bun run db:migrate
cd ../..

# Generate Prisma clients
bun run db:generate

# Start all apps
bun run dev
```

### Local endpoints

- App: `http://localhost:3000`
- API: `http://localhost:3001`
- Portal: `http://localhost:3002`

## Monorepo layout

```text
apps/
  app/               Next.js main application
  api/               NestJS backend API
  portal/            Next.js customer portal
  docs/              Documentation site
  device-agent/      Electron desktop agent

packages/
  db/                Prisma schema, client, migrations
  ui/                Shared component library
  email/             Email templates (React Email)
  kv/                Key-value store (Upstash Redis)
  analytics/         Analytics utilities
  auth/              Authentication (Better Auth)
  integrations/      Third-party integrations
  integration-platform/  Integration platform core
  utils/             Shared utilities
```

## Run commands

```bash
# Development (all apps)
bun run dev

# Generate Prisma clients (required after schema changes or pulling)
bun run db:generate

# Build all
bun run build

# Lint and type check
bun run lint
bun run check-types

# Tests
bun run test
```

## Environment setup

Create `.env` files from the examples:

```bash
cp apps/app/.env.example apps/app/.env
cp apps/portal/.env.example apps/portal/.env
cp packages/db/.env.example packages/db/.env
```

Required variables for `apps/app/.env`:

```env
AUTH_SECRET=""                    # openssl rand -base64 32
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/comp"
RESEND_API_KEY=""                # From https://resend.com/api-keys
NEXT_PUBLIC_PORTAL_URL="http://localhost:3002"
REVALIDATION_SECRET=""           # openssl rand -base64 32
```

### Third-party services

- **Google OAuth** — [Cloud Console](https://console.cloud.google.com/auth/clients). Add redirect URIs for `localhost:3000` and `localhost:3002`.
- **Trigger.dev** — [cloud.trigger.dev](https://cloud.trigger.dev). Create a project and set the project ID in `apps/app/trigger.config.ts`.
- **Upstash Redis** — [console.upstash.com](https://console.upstash.com). Create a Redis database and add the URL/token to `.env`.

## Database

```bash
cd packages/db

# Start Postgres (Docker)
bun run docker:up

# Run migrations
bun run db:migrate

# Generate Prisma client
bun run db:generate

# Push schema (no migration)
bun run db:push

# Seed data
bun run db:seed

# Open Prisma Studio
bun run db:studio

# Stop / remove database
bun run docker:down
bun run docker:clean
```

Default credentials: `postgres:postgres@localhost:5432/comp`

## Package publishing

Published to npm via semantic-release on merges to `release`:

- `@trycompai/db` — Database utilities
- `@trycompai/email` — Email templates
- `@trycompai/kv` — Key-value store
- `@trycompai/ui` — Component library

```bash
# Install a published package
npm install @trycompai/ui

# Use in your project
import { Button } from '@trycompai/ui/button'
```

## Recognition

<a href="https://www.producthunt.com/posts/comp-ai?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-comp&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=944698&theme=light&period=daily&t=1745500415958" alt="Comp AI — #1 Product of the Day" style="width: 250px; height: 54px;" width="250" height="54" /></a>

<a href="https://vercel.com/oss"><img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" /></a>

## Contributing

<a href="https://github.com/trycompai/comp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=trycompai/comp" />
</a>

![Repo activity](https://repobeats.axiom.co/api/embed/1371c2fe20e274ff1e0e8d4ca225455dea609cb9.svg 'Repobeats analytics image')

## License

Comp AI, Inc. is a commercial open source company. The core technology (99%) is licensed under [AGPLv3](https://opensource.org/license/agpl-v3). Enterprise features under `/ee` require a commercial license. See [LICENSE](https://github.com/trycompai/comp/blob/main/LICENSE) for details.

Open a [discussion](https://github.com/trycompai/comp/discussions) if you have questions about what's open vs commercial.
