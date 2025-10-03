<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/trycompai/comp">
   <img src="https://assets.trycomp.ai/logo.png" alt="Logo" width="10%">
  </a>

  <h3 align="center">Comp AI</h3>

  <p align="center">
    The open-source compliance platform.
    <br />
    <a href="https://trycomp.ai"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="https://discord.gg/compai">Discord</a>
    ·
    <a href="https://trycomp.ai">Website</a>
    ·
    <a href="https://trycomp.ai/docs">Documentation</a>
    ·
    <a href="https://github.com/trycompai/comp/issues">Issues</a>
    ·
    <a href="https://roadmap.trycomp.ai/roadmap">Roadmap</a>
  </p>
</p>

<p align="center">
   <a href="https://www.producthunt.com/products/comp-ai-get-soc-2-iso-27001-gdpr/launches/comp-ai"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%Day%23DA552E" alt="Product Hunt"></a>
   <a href="https://github.com/trycompai/comp/stargazers"><img src="https://img.shields.io/github/stars/trycompai/comp" alt="Github Stars"></a>
   <a href="https://github.com/trycompai/comp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-purple" alt="License"></a>
   <a href="https://github.com/trycompai/comp/pulse"><img src="https://img.shields.io/github/commit-activity/m/trycompai/comp" alt="Commits-per-month"></a>
   <a href="https://github.com/trycompai/comp/issues"><img src="https://img.shields.io/badge/Help%20Wanted-Contribute-blue"></a>
</p>

## About

### AI that handles compliance for you in hours.

Comp AI is the fastest way to get compliant with frameworks like SOC 2, ISO 27001, HIPAA and GDPR. Comp AI automates evidence collection, policy management, and control implementation while keeping you in control of your data and infrastructure.

## Recognition

#### [ProductHunt](https://www.producthunt.com/posts/comp-ai)

<a href="https://www.producthunt.com/posts/comp-ai?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-comp&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=944698&theme=light&period=daily&t=1745500415958" alt="Comp&#0032;AI - The&#0032;open&#0032;source&#0032;Vanta&#0032;&#0038;&#0032;Drata&#0032;alternative | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

#### [Vercel](https://vercel.com/)

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

### Built With

- [Next.js](https://nextjs.org/?ref=trycomp.ai)
- [Trigger.dev](https://trigger.dev/?ref=trycomp.ai)
- [Prisma](https://prisma.io/?ref=trycomp.ai)
- [Tailwind CSS](https://tailwindcss.com/?ref=trycomp.ai)
- [Upstash](https://upstash.com/?ref=trycomp.ai)
- [Vercel](https://vercel.com/?ref=trycomp.ai)

## Contact us

Contact our founders at hello@trycomp.ai to learn more about how we can help you achieve compliance.

## Stay Up-to-Date

Get access to the cloud hosted version of [Comp AI](https://trycomp.ai).

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run Comp AI without Docker.

- Node.js (Version: >=20.x)
- Bun (Version: >=1.1.36)
- Postgres (Version: >=15.x)

- Turbo (Optional):
```sh
   bun add -g turbo
```

### Local Development Setup

1. There are 3 main serices that have independent `.env` files, these need to be updated/maintained independently.

- Main Application:
```sh
   cp apps/app/.env.example apps/app/.env
```

- Employee Portal:
```sh
   cp apps/portal/.env.example apps/portal/.env
```

- Migrator/Seeder Service
```sh
   cp packages/db/.env.example packages/db/.env
```

2. Clone the repo:

```sh
   git clone https://github.com/trycompai/comp.git
```

3. Navigate to the project directory:

```sh
   cd comp
```

4. Install dependencies using Bun:

```sh
   bun install
```

5. Start the apps:

```sh
   bun run dev
```

Or use the Turbo repo script:

```sh
   turbo dev
```

---

### Docker Compose
This still requires you to bring your own Postgres DB, AWS S3 Bucket, Firecrawl API Key, OpenAPI compatible Endpoint, Resend API Key, Trigger Project + Key, and Upstash redis API Key. -- Work to move these into the compose still needs to be done, SeaweedFS should be looked at as an AWS replacment --

1. Clone the repo:

```sh
   git clone https://github.com/trycompai/comp.git
```

2. Navigate to the project directory:

```sh
   cd comp
```

3. Copy the root example file and fill in the required values.

```sh
   cp .env.example .env
```

4. Set the required values (at minimum):
Variables that are uncommeented in `.env.example` are required, the commented out ones are optional and can be enabled as needed. 
Setting `FORCE_DATABASE_WIPE_AND_RESEED="true"` will wipe and reseed the local database the next time the containers start. And will continue to do it on every start until you flip it to `FORCE_DATABASE_WIPE_AND_RESEED="false"`.
Anytime you are using docker it is recomended that you set APP_ENVIRONMENT="local" there are other options but their implementation is experimental.

5. Bring the full stack up:

```sh
   docker compose up --build -d
```

6. SPECIAL NOTE: If you are getting stuck on resolving metadata provenance or the build hangs (more likely on MacOs) just restart the build, this is normal behavior related to your dns settings and/or a misconfigured envrionment variable which cannot connect to your service at build time. You can use Bake(docker-cacheing) to bypass the provenance hang.

```sh
   docker buildx bake --set *.provenance=false
   docker compose up --build --progress plain -d
```

To see why your are hanging you can run the following, which will do the docker build but maintain all logs, so you can audit the process.

```sh
   docker compose build --progress plain
```

The compose stack automatically runs database migrations and seeds if your database does not have them yet. 
Static images are served without Next.js image optimisation when `APP_ENVIRONMENT=local`, which resolves the server/client mismatch when requesting/serving images.

To force optimisation while still self-hosting, set `SELF_HOSTING=false` in `.env`; setting it to `true` (or leaving it empty while `APP_ENVIRONMENT=local`) keeps optimisation disabled so images/artwork load correctly. -- UnTested But Theoretically Correct-- 


## Cloud & Auth Configuration

### 1. Trigger.dev - Required

- Create an account on [https://cloud.trigger.dev](https://cloud.trigger.dev)
- Create a project and copy the Project ID
- Generate a Personal Access Token from **Account → Tokens** (or [https://cloud.trigger.dev/account/tokens](https://cloud.trigger.dev/account/tokens)) and copy the value; this becomes your `TRIGGER_ACCESS_TOKEN`.
- In `comp/apps/app/.env`, set:
```sh
  TRIGGER_PROJECT_ID="proj_****az***ywb**ob*"
  TRIGGER_ACCESS_TOKEN="tr_pat_***************"
```
- Optionally set `TRIGGER_QUEUE_CONCURRENCY` (defaults to 10) in `.env` to control how many Trigger.dev jobs run in parallel ie connect to your database.
- Expose your local app and portal to Trigger.dev with a public tunnel (e.g. ngrok). Trigger.dev will need to have a hopy of your env secrets so it can run. There you can place  NEXT_PUBLIC_BETTER_AUTH_URL and NEXT_PUBLIC_PORTAL_URL with the public values. This way Trigger.dev can validate its actions are working. 
```sh
  brew install ngrok
  ngrok config add-authtoken <your-token>
  ngrok http 3000
  ngrok http 3002
```

### 2. PostgreSQL Requirements

- Enable the `pgcrypto` extension on your database (run `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` once per cluster).
- Keep connection pooling in place for Trigger.dev (PgBouncer, Prisma Accelerate/Data Proxy, or managed pooling from your cloud provider) so application and Trigger.dev workloads stay within Postgres `max_connections`. Do not use PgBouncer on the App side, it will cause migrations to fail.

### 3. Google OAuth - Optional

- Go to [Google Cloud OAuth Console](https://console.cloud.google.com/auth/clients)
- Create an OAuth client:
  - Type: Web Application
  - Name: `comp_app` # You can choose a different name if you prefer!
- Add these **Authorized Redirect URIs**:

```
  http://localhost
  http://localhost:3000
  http://localhost:3002
  http://localhost:3000/api/auth/callback/google
  http://localhost:3002/api/auth/callback/google
  http://localhost:3000/auth
  http://localhost:3002/auth
```

- After creating the app, copy the `GOOGLE_ID` and `GOOGLE_SECRET`
  - Add them to your `.env` files as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`

### 4. Redis (Upstash) - Required

- Go to [https://console.upstash.com](https://console.upstash.com)
- Create a Redis database
- Copy the **TOKEN** and **Redis URL**
- Add them to your `.env` files as `UPSTASH_REDIS_REST_TOKEN` and `UPSTASH_REDIS_REST_URL`

---

### 5. Database Setup = Required-ish (NOT Required for Docker Compose setups)

Start and initialize your own PostgreSQL database. Add the PostgreSQL connection URI to the .env files as `DATABASE_URL` example: DATABASE_URL="postgresql://[username[:password]@]host[:port]/database[?options]"

1. Initialize schema and seed - Automatic if using Docker Compose additionally docker compose installations will automatically apply new migrations if there is any on every startup without harming your data.

```sh
   # Generate Prisma client (Build "Migrator" Templates)
   bun db:generate

   # Push the schema to your Postgres database
   bun db:push

   # CAUTION: Run only once! - Seed the database with initial data
   bun db:seed
```

Other useful database commands:

```sh
   # Open Prisma Studio to view/edit data
   bun db:studio

   # Run database migrations
   bun db:migrate
```

---

### Vercel

Steps to deploy Comp AI on Vercel are coming soon.

## 📦 Package Publishing

This repository uses semantic-release to automatically publish packages to npm when merging to the `release` branch. The following packages are published:

- `@comp/db` - Database utilities with Prisma client
- `@comp/email` - Email templates and components
- `@comp/kv` - Key-value store utilities using Upstash Redis
- `@comp/ui` - UI component library with Tailwind CSS

### Setup

1. **NPM Token**: Add your npm token as `NPM_TOKEN` in GitHub repository secrets
2. **Release Branch**: Create and merge PRs into the `release` branch to trigger publishing
3. **Versioning**: Uses conventional commits for automatic version bumping

### Usage

```bash
   # Install a published package
   npm install @comp/ui

   # Use in your project
   import { Button } from '@comp/ui/button'
   import { client } from '@comp/kv'
```

### Development

```bash
   # Build all packages
   bun run build

   # Build specific package
   bun run -F @comp/ui build

   # Test packages locally
   bun run release:packages --dry-run
```

## Contributors

<a href="https://github.com/trycompai/comp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=trycompai/comp" />
</a>

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/1371c2fe20e274ff1e0e8d4ca225455dea609cb9.svg 'Repobeats analytics image')

<!-- LICENSE -->

## License

Comp AI, Inc. is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core" where the core technology (99%) is fully open source, licensed under [AGPLv3](https://opensource.org/license/agpl-v3) and the last 1% is covered under a commercial license (["/ee" Enterprise Edition"]).

> [!TIP]
> We work closely with the community and always invite feedback about what should be open and what is fine to be commercial. This list is not set and stone and we have moved things from commercial to open in the past. Please open a [discussion](https://github.com/trycompai/comp/discussions) if you feel like something is wrong.
