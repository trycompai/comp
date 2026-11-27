# Local stack

This document tells you how to start the full Comp AI stack on one machine with
local services only. The stack is declared in `.atlas/services.yaml`. You can
also run each `command` by hand with the same `env` values.

All values in `.atlas/services.yaml` are local development defaults. They are
not secrets. Do not use them in a deployed environment.

## Services

| Service    | Port | Health route  | What it runs                                 |
| ---------- | ---- | ------------- | -------------------------------------------- |
| `postgres` | 5432 | TCP           | PostgreSQL 17 (Docker)                       |
| `redis`    | 8079 | TCP           | Redis and an Upstash REST emulator (Docker)  |
| `s3`       | 8333 | TCP           | S3-compatible storage, SeaweedFS (Docker)    |
| `api`      | 3333 | `/v1/health`  | NestJS API, run by `bun --watch src/main.ts` |
| `app`      | 3000 | `/api/health` | Main web app, `next dev`                     |
| `portal`   | 3002 | `/`           | Employee portal, `next dev`                  |

The Docker services use the Compose project name `comp-local` and two files:
`packages/db/docker-compose.yml` and `.atlas/docker-compose.local.yml`.

### Start order

1. `postgres`, `redis` and `s3` start first.
2. `api` starts when the three infrastructure services are ready.
3. `app` and `portal` start when `api` is ready.

`needs` in `.atlas/services.yaml` sets this order. When you start `app`, Atlas
starts `postgres`, `redis`, `s3` and `api` first.

### Setup

The `api` service runs these setup steps one time, before its first start:

1. `bun install --frozen-lockfile`
2. Generate the Prisma clients.
3. Build the workspace packages that the apps import (`turbo run build` for
   the dependencies of `api`, `app` and `portal`).
4. `prisma migrate deploy`.
5. `prisma/seed/seed.ts`: framework templates and other reference data.
6. `prisma/seed/local-dev.ts`: test users, test organizations, sessions and
   API keys.
7. Make the S3 buckets.

`app` and `portal` generate their own Prisma clients in their setup.

## Which services to start

| Type of work                      | Services to start                                 |
| --------------------------------- | ------------------------------------------------- |
| API endpoint, guard or service    | `api` (it starts `postgres`, `redis`, `s3`)       |
| Page or component in the main app | `app` (it starts `api` and the infrastructure)    |
| Employee portal                   | `portal` (it starts `api` and the infrastructure) |
| Background job (Trigger.dev task) | `postgres`. Then run the unit tests of the task.  |

Do not start `app` and `portal` together on a machine with 8 GB of memory
unless you must. See [Memory](#memory).

## Seeded users and organizations

`packages/db/prisma/seed/local-dev.ts` makes this data. It runs only when
`DATABASE_URL` points to `localhost`, `127.0.0.1` or `::1`.

| Organization | ID            | User                     | Role     |
| ------------ | ------------- | ------------------------ | -------- |
| Local Org A  | `org_local_a` | `owner-a@example.com`    | owner    |
| Local Org A  | `org_local_a` | `employee-a@example.com` | employee |
| Local Org B  | `org_local_b` | `owner-b@example.com`    | owner    |

Use Org A and Org B to test access between organizations. `employee-a` is a
user with few permissions, for RBAC tests.

Each run of the script makes new sessions and new API keys, and writes them to
`packages/db/.local-dev-credentials.json`. Git ignores this file. To make new
credentials, run the script again:

```sh
cd packages/db
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/comp \
SECRET_KEY=local-dev-secret-key-change-me \
bun prisma/seed/local-dev.ts
```

`SECRET_KEY` must be the same value as the `SECRET_KEY` of the `api` service,
because the script signs the session cookies with it.

## Sign in

Use `http://localhost:<port>` URLs. Do not use the public preview URLs for
signed-in work. `app` and `portal` also have a preview URL (`portal: true`).
`PREVIEW_URL` gives that URL to `next.config.ts`, which adds its host to
`allowedDevOrigins`, so live reload (HMR) works there. Use a preview URL to
look at public pages, for example `/auth`. The API sets a host-only cookie on `localhost`, and the app
reads that cookie on the server. A preview URL is a different host, so the
app does not get the cookie.

### Method 1: seeded session cookie (fastest)

Read the cookie from the credentials file and set it in the browser:

```sh
COOKIE=$(jq -r '.users[] | select(.email=="owner-a@example.com") | .sessionCookie' \
  packages/db/.local-dev-credentials.json)
agent-browser cookies set local.session_token "${COOKIE#local.session_token=}" \
  --url http://localhost:3000
agent-browser open http://localhost:3000/
```

The browser opens `http://localhost:3000/org_local_a/overview`.

### Method 2: magic link (real sign-in flow)

1. Open `http://localhost:3000/auth` and enter a seeded email.
2. The page shows an error, because no email worker runs locally. This is
   expected.
3. Find the link in the `api` log. The API writes it when `NODE_ENV` is
   `development`:

   ```text
   [Auth] Magic link URL: http://localhost:3333/api/auth/magic-link/verify?token=...
   ```

4. Open that link in the browser. The API sets the session cookie and sends
   you to the app.

## Call the API

With an API key (all scopes, one organization):

```sh
KEY=$(jq -r '.apiKeys.org_local_a' packages/db/.local-dev-credentials.json)
curl -H "x-api-key: $KEY" http://localhost:3333/v1/people
```

With a session cookie or a bearer token:

```sh
CRED=packages/db/.local-dev-credentials.json
COOKIE=$(jq -r '.users[0].sessionCookie' $CRED)
curl -H "Cookie: $COOKIE" http://localhost:3333/v1/organization
TOKEN=$(jq -r '.users[0].bearerToken' $CRED)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3333/v1/organization
```

## Secrets

The stack needs no external secret. External services get one of these:

- A dummy value that lets the module start (`MACED_API_KEY`, `RESEND_API_KEY`).
- A base URL on a closed local port (`http://127.0.0.1:9`), so a call fails at
  once and never leaves the machine (`MACED_API_BASE_URL`,
  `BACKGROUND_CHECK_API_BASE_URL`).
- No value, so the feature stays off (OpenAI, Anthropic, Groq, Firecrawl,
  Browserbase, Trigger.dev, Novu, Stripe, Google, GitHub and Microsoft
  sign-in).

Features that call these services do not work locally. Test them with unit
tests and mocks.

## Memory

Measured on a sandbox with 4 vCPU and 8 GB of memory, no swap.

| Process                         | Memory (RSS)                          |
| ------------------------------- | ------------------------------------- |
| Docker services together        | about 220 MB                          |
| `api`                           | about 450 MB                          |
| `app`, after 5 pages compiled   | about 3.0 GB, it grows with each page |
| `portal`, after 1 page compiled | about 1.4 GB                          |
| One browser session             | 250 to 400 MB                         |

- Full stack, no browser: 6.0 GB used.
- Full stack and three browser sessions: 7.3 GB used (peak). This is near the
  limit.
- `api` with the infrastructure: about 1.4 GB used.
- `api`, `app` and one browser: about 5 GB used.

Use a machine with 16 GB of memory to run the full stack. 8 GB is sufficient
for `api` and `app`, or for `api` and `portal`.

## Clean start

Stop all services. Then remove the Docker containers and volumes of this
stack only:

```sh
docker compose -p comp-local -f packages/db/docker-compose.yml \
  -f .atlas/docker-compose.local.yml down -v
```

Start `app` again. Setup runs again on a new session and makes the database
again from the migrations and the seeds.

## Known problems

- The API runs on Bun (`bun --watch src/main.ts`), not on Node. Production
  runs on Node. `nest start --watch` runs a full `tsc` watch program that needs
  about 4 GB, and the kernel stops it when the app also runs. The Bun runtime
  does not type-check. Run `bunx turbo run typecheck --filter=@trycompai/api`
  to type-check. If you must test on Node, stop `api` and run
  `NODE_OPTIONS=--max-old-space-size=4096 bun run dev:no-trigger` in
  `apps/api` with the same environment.
- No Trigger.dev worker runs locally. Code that calls `tasks.trigger` fails
  with an error in the log. Email (magic link, OTP, invitations) goes through
  Trigger.dev, so no email is sent.
- The email OTP sign-in does not work locally, because the OTP is not written
  to the log. Use the magic link or the seeded cookie.
- In development, the API writes `packages/docs/openapi.json` when it starts.
  Do not commit that change unless you changed an endpoint.
- The ports 3000, 3002 and 3333 are fixed. The code uses them as defaults, and
  the trusted origins of the API list them.
- The first load of each app page compiles it, which can take more than a
  minute. A browser tool can report a timeout. Open the page again.
- When a user opens an organization that is not theirs, the app sends them to
  `/auth/unauthorized`, which returns 404. Access is still denied.
- The seeded organizations have no frameworks, so the overview pages have
  little data. Add data through the app or the API.
