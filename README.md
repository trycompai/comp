<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/trycompai/comp">
   <img src="https://trycomp.ai/logo.png" alt="Logo">
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
    <a href="https://github.com/orgs/trycompai/projects/1">Roadmap</a>
  </p>
</p>

## About

# Security and compliance, open.

We're building the first open source compliance automation platform that helps companies of any size work towards, manage and achieve compliance with common standards like SOC 2, ISO 27001 and GDPR.

We transform compliance from a vendor checkbox into an engineering problem solved through code. Our platform automates evidence collection, policy management, and control implementation while keeping you in control of your data and infrastructure.

## Recognition

#### [ProductHunt](https://www.producthunt.com/posts/comp-ai)

<a href="https://www.producthunt.com/posts/comp-ai?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-comp&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=944698&theme=light&period=daily&t=1745500415958" alt="Comp&#0032;AI - The&#0032;open&#0032;source&#0032;Vanta&#0032;&#0038;&#0032;Drata&#0032;alternative | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

### [Vercel](https://vercel.com)

<br />
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
- [Novu](https://novu.co/?ref=trycomp.ai)

## Contact us

Contact our founders at hello@trycomp.ai to learn more about how we can help you achieve compliance.

## Stay Up-to-Date

Join our [waitlist](https://trycomp.ai) to get early access to the cloud hosted version of Comp AI.

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run Comp AI.

- Node.js (Version: >=20.x)
- Bun (Version: >=1.1.36)
- Postgres (Version: >=15.x)

## Development

To get the project working locally with all integrations, follow these extended development steps.

### Setup

1. Clone the repo:

   ```sh
   git clone https://github.com/trycompai/comp.git
   ```

2. Navigate to the project directory:

   ```sh
   cd comp
   ```

3. Remove existing lock files:

#### Linux / macOS

```sh
rm bun.lock yarn.lock
```

#### Windows (Command Prompt)

```cmd
del bun.lock yarn.lock
```

#### Windows (PowerShell)

```powershell
Remove-Item bun.lock, yarn.lock
```

4. Remove any `yarn` references from `comp/apps/app/package.json`

```sh
"yarn": "^1.22.22",
```

> 💡 Make sure this line is already deleted or running `bun install` will give you an error.

5. Install dependencies using Bun:

```sh
   bun install
```

6. Install `concurrently` as a dev dependency:

```sh
   bun add -d concurrently
```

---

### Environment Setup

Create the following `.env` files and fill them out with your credentials:

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
  project: "proj_****az***ywb**ob*";
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

### Hardcoding Env Vars (if needed)

If `.env` files don’t load values as expected, you can hard-code the following:

- **`comp/packages/kv/src/index.ts`** → Hard-coded Redis client credentials:

  - **URL**: The Redis URL needs to start with `https`. Example:
    ```sh
    url: "https://default:AXhaAA***MA@charmed-wombat-3**0.upstash.io:6379"
    ```
  - **Token**: Example:
    ```sh
    token: "935****8f20"
    ```

- **`comp/packages/db/prisma/schema.prisma`** → Hard-coded `DATABASE_URL`:

  - Example:
    `sh
    datasource db {
  url        = "postpostgresql://user:password@host:port/database?schema=public"
  directUrl  = "postpostgresql://user:password@host:port/database?schema=public"
}
    `

- **`comp/apps/portal/src/app/lib/auth.ts`** → Hard-coded Google environment variables `clientId`, `clientSecret` under `socialProviders/google`:

  - Example:
    ```js
    socialProviders: {
      google: {
        clientId: "your-client-id",
        clientSecret: "your-client-secret"
      }
    }
    ```

- **`comp/apps/app/trigger.config.ts`** → Change the project to yours:
  - Example:
    ```sh
    projectId: "proj_la**ob"
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

## Contributors

<a href="https://github.com/trycompai/comp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=trycompai/comp" />
</a>

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/1371c2fe20e274ff1e0e8d4ca225455dea609cb9.svg "Repobeats analytics image")

<!-- LICENSE -->

## License

Comp AI, Inc. is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core" where the core technology (99%) is fully open source, licensed under [AGPLv3](https://opensource.org/license/agpl-v3) and the last 1% is covered under a commercial license (["/ee" Enterprise Edition"]).

> [!TIP]
> We work closely with the community and always invite feedback about what should be open and what is fine to be commercial. This list is not set and stone and we have moved things from commercial to open in the past. Please open a [discussion](https://github.com/trycompai/comp/discussions) if you feel like something is wrong.

```

```
