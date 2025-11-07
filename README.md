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

Here is what you need to be able to run Comp AI.

- Node.js (Version: >=20.x)
- Bun (Version: >=1.1.36)
- Postgres (Version: >=15.x)

## Development

To get the project working locally with all integrations, follow these extended development steps

### Setup

## Add environment variables and fill them out with your credentials

```sh
cp apps/app/.env.example apps/app/.env
cp apps/portal/.env.example apps/portal/.env
cp packages/db/.env.example packages/db/.env
```

## Get code running locally

1. Clone the repo

```sh
git clone https://github.com/trycompai/comp.git
```

2. Navigate to the project directory

```sh
cd comp
```

3. Install dependencies using Bun

```sh
bun install
```

4. Get Database Running

```sh
cd packages/db
bun run docker:up # Spin up docker container
bun run db:migrate # Run migrations
```

5. Generate Prisma Types for each app

```sh
cd apps/app
bun run db:generate
cd ../portal
bun run db:generate
cd ../api
bun run db:generate
```

6. Run all apps in parallel from the root directory

```sh
bun run dev
```

---

### Environment Setup

Create the following `.env` files and fill them out with your credentials

- `comp/apps/app/.env`
- `comp/apps/portal/.env`
- `comp/packages/db/.env`

You can copy from the `.env.example` files:

### Linux / macOS

```sh
cp apps/app/.env.example apps/app/.env
cp apps/portal/.env.example apps/portal/.env
cp packages/db/.env.example packages/db/.env
```

### Windows (Command Prompt)

```cmd
copy apps\app\.env.example apps\app\.env
copy apps\portal\.env.example apps\portal\.env
copy packages\db\.env.example packages\db\.env
```

### Windows (PowerShell)

```powershell
Copy-Item apps\app\.env.example -Destination apps\app\.env
Copy-Item apps\portal\.env.example -Destination apps\portal\.env
Copy-Item packages\db\.env.example -Destination packages\db\.env
```

Additionally, ensure the following required environment variables are added to `.env` in `comp/apps/app/.env`:

```env
AUTH_SECRET=""                  # Use `openssl rand -base64 32` to generate
DATABASE_URL="postgresql://user:password@host:port/database"
RESEND_API_KEY="" # Resend (https://resend.com/api-keys) - Resend Dashboard -> API Keys
NEXT_PUBLIC_PORTAL_URL="http://localhost:3002"
REVALIDATION_SECRET=""         # Use `openssl rand -base64 32` to generate
```

> ✅ Make sure you have all of these variables in your `.env` file.
> If you're copying from `.env.example`, it might be missing the last two (`NEXT_PUBLIC_PORTAL_URL` and `REVALIDATION_SECRET`), so be sure to add them manually.

Some environment variables may not load correctly from `.env` — in such cases, **hard-code** the values directly in the relevant files (see Hardcoding section below).

---

### Cloud & Auth Configuration

#### 1. Trigger.dev

- Create an account on [https://cloud.trigger.dev](https://cloud.trigger.dev)
- Create a project and copy the Project ID
- In `comp/apps/app/trigger.config.ts`, set:
  ```ts
  project: 'proj_****az***ywb**ob*';
  ```

#### 2. Google OAuth

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
  - Add them to your `.env` files
  - If that doesn’t work, hard-code them in:
    ```
    comp/apps/portal/src/app/lib/auth.ts
    ```

#### 3. Redis (Upstash)

- Go to [https://console.upstash.com](https://console.upstash.com)
- Create a Redis database
- Copy the **Redis URL** and **TOKEN**
- Add them to your `.env` file, or hard-code them if the environment variables are not being recognized in:
  ```
  comp/packages/kv/src/index.ts
  ```

---

### Database Setup

Start and initialize the PostgreSQL database using Docker:

1. Start the database:

   ```sh
   cd packages/db
   bun docker:up
   ```

2. Default credentials:
   - Database name: `comp`
   - Username: `postgres`
   - Password: `postgres`

3. To change the default password:

   ```sql
   ALTER USER postgres WITH PASSWORD 'new_password';
   ```

4. If you encounter the following error:

   ```
   HINT: No function matches the given name and argument types...
   ```

   Run the fix:

   ```sh
   psql "postgresql://postgres:<your_password>@localhost:5432/comp" -f ./packages/db/prisma/functionDefinition.sql
   ```

   Expected output: `CREATE FUNCTION`

   > 💡 `comp` is the database name. Make sure to use the correct **port** and **database name** for your setup.

5. Apply schema and seed:

```sh
 # Generate Prisma client
 bun db:generate

 # Push the schema to the database
 bun db:push

 # Optional: Seed the database with initial data
 bun db:seed
```

Other useful database commands:

```sh
# Open Prisma Studio to view/edit data
bun db:studio

# Run database migrations
bun db:migrate

# Stop the database container
bun docker:down

# Remove the database container and volume
bun docker:clean
```

---

### Start Development

Once everything is configured:

```sh
bun run dev
```

Or use the Turbo repo script:

```sh
turbo dev
```

> 💡 Make sure you have Turbo installed. If not, you can install it using Bun:

```sh
bun add -g turbo
```

🎉 Yay! You now have a working local instance of Comp AI! 🚀

## Deployment

### Docker

Steps to deploy Comp AI on Docker are coming soon.

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
