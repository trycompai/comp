# Comp AI — Self-Host on a Single Docker Host

This branch (`selfhost-fixes`) carries the patches that make **`trycompai/comp` deployable
end-to-end on one Docker host (e.g. a single AWS EC2 instance) without the surrounding
trycomp.ai cloud (Resend / Trigger.dev / Upstash / Maced / etc.)**.

The upstream `main` self-host docs cover only `app + portal`. The auth server (`apps/api`)
is not in the root `docker-compose.yml`, so login is impossible against an unmodified main.
There are also a handful of build-time and startup-time bugs that block a clean build on
`main`.

This branch adds:

- A patched root `Dockerfile` (4 build-time fixes + seeder dep fix)
- `selfhost/docker-compose.selfhost.yml` — overlay that adds `db` (Postgres-with-TLS),
  `redis`, `srh` (Upstash-compatible REST proxy), and the `api` service
- `selfhost/api-patch.sh` — runtime patches applied at api container start:
  Anthropic model upgrade to `claude-opus-4-7`, Prisma SSL, MACED guard,
  email stub, helmet CORP, isTrustedOrigin = true, getCustomDomains no-op
- `selfhost/.env.{app,portal,api,db}.example` — full env templates with every var that
  any module hard-requires
- `selfhost/userdata.sh` + `selfhost/aws-bootstrap.sh` — provision a fresh EC2 in one command
- `selfhost/run-seeder.sh` — works around a Prisma-client-path bug in the seeder
- `selfhost/provision-s3.sh` — one-shot S3 bucket + scoped IAM user
- `selfhost/post-onboarding.sql` — clears "Setup needs attention" when Trigger.dev
  workers aren't deployed

---

## Quick start (single-host, AWS EC2)

Prereqs:
- AWS account + named CLI profile with EC2 + EIP permissions
- Trigger.dev account + a project (free tier OK) — required to complete onboarding
- (optional) Resend, OpenAI, Firecrawl, S3 bucket — features that need them error gracefully if blank

```bash
# 1. Provision EC2 + EIP + SG + key pair
AWS_PROFILE=crypto AWS_REGION=ap-south-1 ./selfhost/aws-bootstrap.sh
# Note the PUBLIC_IP and INSTANCE_ID in the output.

# 2. Push this repo to the box
PUBLIC_IP=<from step 1>
ssh -i ~/.ssh/compliance-key.pem ec2-user@$PUBLIC_IP "mkdir -p /opt/compliance"
rsync -e "ssh -i ~/.ssh/compliance-key.pem" -av --exclude='.git' --exclude='node_modules' \
  ./ ec2-user@$PUBLIC_IP:/opt/compliance/

# 3. SSH in and create env files
ssh -i ~/.ssh/compliance-key.pem ec2-user@$PUBLIC_IP
cd /opt/compliance

# Generate secrets once and stash for the .env files
PG_PASSWORD=$(openssl rand -hex 16)
SRH_TOKEN=$(openssl rand -hex 16)
AUTH_SECRET=$(openssl rand -base64 32)
SECRET_KEY=$(openssl rand -base64 32)
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
INTERNAL_API_TOKEN=$(openssl rand -base64 32)
REVALIDATION_SECRET=$(openssl rand -base64 32)
SERVICE_TOKEN_PORTAL=$(openssl rand -base64 32)
SERVICE_TOKEN_TRIGGER=$(openssl rand -base64 32)

# Now create the four .env files. Take the templates in selfhost/, replace placeholders:
cp selfhost/.env.app.example apps/app/.env       # sed in PG_PASSWORD, SRH_TOKEN, PUBLIC_IP, AUTH_SECRET, SECRET_KEY, REVALIDATION_SECRET, INTERNAL_API_TOKEN, TRIGGER_SECRET_KEY
cp selfhost/.env.portal.example apps/portal/.env # sed in PG_PASSWORD, SRH_TOKEN, PUBLIC_IP, BETTER_AUTH_SECRET, INTERNAL_API_TOKEN
cp selfhost/.env.api.example apps/api/.env       # sed in everything from above + SERVICE_TOKEN_*
cp selfhost/.env.db.example packages/db/.env     # sed in PG_PASSWORD

# 4. Postgres TLS cert (Comp AI's Prisma client demands TLS)
mkdir -p selfhost/pg-tls
openssl req -new -x509 -days 365 -nodes \
  -out selfhost/pg-tls/server.crt -keyout selfhost/pg-tls/server.key \
  -subj "/CN=db"
sudo chown 70:70 selfhost/pg-tls/server.{crt,key}
sudo chmod 600 selfhost/pg-tls/server.key

# 5. Build (sequential is safer; parallel is ~2x faster on 8 GB RAM)
export PG_PASSWORD SRH_TOKEN
export BETTER_AUTH_URL=http://${PUBLIC_IP}:3000
export BETTER_AUTH_URL_PORTAL=http://${PUBLIC_IP}:3002
COMPOSE="docker compose -f docker-compose.yml -f selfhost/docker-compose.selfhost.yml"
$COMPOSE build api          # ~10–15 min
$COMPOSE build app portal   # ~10–15 min

# 6. Bring up infra, run migrations
$COMPOSE up -d db redis srh
$COMPOSE run --rm migrator
$COMPOSE run --rm seeder    # ⚠️ KNOWN BROKEN — see "Seeder" below

# 7. Start app servers
$COMPOSE up -d api app portal

# 8. Verify
curl -sS -o /dev/null -w "api: %{http_code}\n"    http://${PUBLIC_IP}:3333/v1/health
curl -sSL -o /dev/null -w "app: %{http_code}\n"   http://${PUBLIC_IP}:3000
curl -sS -o /dev/null -w "portal: %{http_code}\n" http://${PUBLIC_IP}:3002
```

Sign in:
- If Resend is wired → go to `http://${PUBLIC_IP}:3000/auth`, enter your email, click the
  link in your inbox.
- If Resend is **not** wired → request a magic link via the API and grep stdout:
  ```bash
  curl -sS -X POST "http://${PUBLIC_IP}:3333/api/auth/sign-in/magic-link" \
    -H "Content-Type: application/json" -H "Origin: http://${PUBLIC_IP}:3000" \
    -d "{\"email\":\"you@example.com\",\"callbackURL\":\"http://${PUBLIC_IP}:3000\"}"
  docker logs --since 10s compliance-api-1 2>&1 | grep -A1 "MAGIC LINK"
  ```
  Open the URL it prints — single use, expires in 1 hour. The session cookie is set on
  the redirect to `/`.

## Resize down for steady state

The Bun monorepo build wants ≥6 GB RAM, but runtime fits in 4 GB. After build:

```bash
aws ec2 stop-instances --profile crypto --region ap-south-1 --instance-ids $INSTANCE
aws ec2 wait instance-stopped --profile crypto --region ap-south-1 --instance-ids $INSTANCE
aws ec2 modify-instance-attribute --profile crypto --region ap-south-1 \
  --instance-id $INSTANCE --instance-type '{"Value":"t4g.medium"}'
aws ec2 start-instances --profile crypto --region ap-south-1 --instance-ids $INSTANCE
```

EIP stays attached. ~$48/mo → ~$24/mo.

---

## What's in the patched `Dockerfile`

The upstream root `Dockerfile` builds `app + portal + migrator`. Four bugs prevent a clean
build on `main`:

| # | Bug | Patch (in this branch) |
|---|-----|----|
| 1 | `deps` stage `COPY`s only 8 of 15 `packages/*/package.json` — `bun install` fails resolving `workspace:*` for `auth`, `billing`, `company`, `db`, `device-agent`, `docs`, `framework-editor-cli` | Added the 7 missing `COPY` lines |
| 2 | Workspace packages (`@trycompai/auth`, `company`, `email`, etc.) declare `"main": "./dist/index.js"` but their TypeScript is never compiled — `next build` can't resolve them | Added a `RUN` loop that builds each workspace package (`db` first, since others depend on its types) before `next build` |
| 3 | `apps/{app,portal}/prisma/schema/` only contains `schema.prisma`; the 47 model `.prisma` files live in `packages/db/prisma/schema/`. `next build`'s post-compile typecheck fails (no `Policy`, no `User`, etc.) | Added `RUN cd apps/{app,portal} && bun run db:getschema` before each build |
| 4 | `next build`'s route prerender / page-data collection runs at build time — code that initialises the AWS SDK, Better Auth, etc. throws on missing env vars (`Error: Region is missing`) | Added `ENV` block with placeholder values right before each `next build` call. **Note**: `NEXT_PUBLIC_API_URL` is also baked into the browser bundle here — set it to your real public URL at build time. |

Diff against `main`: `git diff main..selfhost-fixes -- Dockerfile`.

## What `selfhost/api-patch.sh` does at api startup

The api Dockerfile (`apps/api/Dockerfile.multistage`) is fine for trycomp.ai's own AWS
deploy but breaks on a vanilla self-host. The patch script runs before the Node process,
modifies the compiled JS, then exec's into the original entrypoint as the `nestjs` user.

| Step | Why |
|------|-----|
| Comment out `MACED_API_KEY is required` throw in `security-penetration-tests.service.js` | The MACED client validates the key format (`mc_live_*` / `mc_dev_*`) — there's no public/free tier, so any placeholder gets rejected at construction. |
| Replace `/app/prisma/client.js`, `/app/dist/prisma/client.js`, and `/app/packages/db/dist/client.js` with a version that uses an explicit `pg.Pool({ ssl: false })` | The shipped clients enable verifying SSL whenever the host isn't `localhost`. With self-signed Postgres TLS, verification fails. The replacement uses a Pool with `ssl: false` so non-TLS connections work even when Postgres has `ssl=on` (Postgres accepts both unless `pg_hba.conf` is `hostssl`). |
| Replace `getCustomDomains()` body with `return new Set()` | Original calls Upstash Redis directly. With `srh` running, this works fine — but if you don't bother with srh, this prevents a startup error. |
| Replace `isTrustedOrigin()` body with `return true` | Single-host self-host doesn't need strict cross-origin lockdown. (If you want it strict: set `AUTH_TRUSTED_ORIGINS` to a comma-separated list and remove this stub.) |
| Replace `sendMagicLink` body with `console.log("[MAGIC LINK] ...")` | If Resend is unwired, this prevents 500s on `/api/auth/sign-in/magic-link` and surfaces the URL in `docker logs compliance-api-1`. |
| Same for `sendVerificationOTP` | OTP fallback. |
| Add `crossOriginResourcePolicy: { policy: "cross-origin" }` and `crossOriginOpenerPolicy: false` to the helmet config in `dist/src/main.js` | Browser blocks the app at `:3000` from loading anything from api at `:3333` because helmet's defaults are `same-origin`. |

If you've wired all the real services, you can drop the email stub, `getCustomDomains`
no-op, and `isTrustedOrigin = true` (just unset them in this script). The MACED stub stays
unless you have a real `mc_live_*` key. The Prisma-client rewrite stays — that's a real
bug, not a workaround.

## Known issues (todo)

- **Seeder.** `bun packages/db/prisma/seed/seed.js` errors with
  `Cannot find module '@prisma/adapter-pg'`. The `migrator` Dockerfile target only
  installs `prisma` + `@prisma/client`, not the adapter — but the seed script imports
  `@prisma/adapter-pg`. Fix: add `@prisma/adapter-pg` and `pg` to the migrator stage's
  inline `package.json`. Until then, the dashboard shows "no policies / frameworks".
- **No HTTPS / no domain.** Naked HTTP on the EIP. Cookies are non-secure. Add a Caddy
  service in front of port 80 with auto-Let's-Encrypt, point a subdomain at the EIP, and
  rebuild app+portal (because `NEXT_PUBLIC_API_URL` is baked in).
- **Auth UI is magic-link only.** `/auth` doesn't expose email+password. Operators with
  no Resend can't sign in via the UI; they have to call `/api/auth/sign-in/email` directly
  with curl, or insert a Better-Auth-format scrypt hash via SQL.

## Filing upstream

Worth opening PRs to `trycompai/comp` for at least these (all in this branch):
- `Dockerfile` patches #1–#4
- `apps/api/src/security-penetration-tests/security-penetration-tests.service.ts` —
  add `if (!apiKey) { this.macedClient = null; return; }` instead of throwing
- `apps/api/src/auth/auth.server.ts` — make `getCustomDomains` return empty set when
  `UPSTASH_REDIS_REST_URL` is unset, instead of constructing a Redis client that throws
- `apps/api/prisma/client.ts` (and `packages/db/src/client.ts`) — accept `db` as a
  TLS-optional host, or default to `ssl: false` when the URL has `sslmode=disable`

## Repo layout

```
selfhost/
├── SELFHOST.md                    — this file
├── api-patch.sh                   — runtime patches for api container
├── docker-compose.selfhost.yml    — overlay (db w/TLS + redis + srh + api)
├── userdata.sh                    — EC2 cloud-init
├── aws-bootstrap.sh               — provision EC2 + EIP + SG + key (one-shot)
├── provision-s3.sh                — S3 bucket + scoped IAM user (one-shot)
├── run-seeder.sh                  — seeder workaround (Prisma client path)
├── post-onboarding.sql            — clears "Setup needs attention" if no Trigger workers
├── pg-tls/                        — generate cert here at deploy time
└── .env.{app,portal,api,db}.example — full env templates

Dockerfile                         — patched (vs upstream main): 4 fixes + seeder dep
```

---

## Day-2 lessons (things that bit us a second time)

### 1. EBS 20 GB is not enough

Docker BuildKit cache + workspace `node_modules` + multiple builder stages
will fill 20 GB. We hit `error: An internal error occurred (NoSpaceLeft)`
mid-build. **Provision 40 GB upfront** — `aws-bootstrap.sh` defaults to 20 GB,
increase the `VolumeSize` value before running, or expand later with
`aws ec2 modify-volume` + `growpart` + `xfs_growfs`.

### 2. `docker system prune -af --volumes` is destructive

Removes any image without a *running* container. If you've stopped your
app/portal/api containers (e.g. to free RAM during a build), prune will
delete those images and you'll have to rebuild everything. Use
`docker buildx prune -f` or a more targeted prune instead.

### 3. The seeder is broken even with the right deps

We patched the migrator stage to install `@prisma/adapter-pg` + `pg` (so
seed.ts imports work). But the seeder still fails because `prisma generate`
writes the client to `node_modules/@trycompai/db/node_modules/@prisma/client`
(nested, relative to the schema's location) while seed.ts imports
`@prisma/client` from the outer `node_modules/`, which is the unfilled stub.

**Fix:** `selfhost/run-seeder.sh` copies the nested generated client over
the outer stub before running seed. After it succeeds you'll have:
- 17 frameworks (SOC 2, ISO 27001, HIPAA, GDPR, NIST CSF, NIST 800-53,
  PCI DSS, ISO 42001, ISO 9001, NEN 7510, NIS 2, etc.)
- 50 control templates
- 37 policy templates
- 74 task templates
- 980 requirements
- 119 framework version maps
- ~600 cross-table relations

### 4. Trigger.dev deploy is its own rabbit hole

The api dispatches `onboard-organization` to Trigger.dev during the
"complete onboarding" flow. With no workers (the default in fresh self-host),
the job queues forever and the dashboard shows "Setup needs attention.
Something went wrong while tailoring your environment."

To deploy the trigger task definitions yourself you need:
- A **Personal Access Token** (`tr_pat_...`) from
  `https://cloud.trigger.dev/account/tokens` — the `tr_dev_*` runtime secret
  key from the project page is **NOT** enough for `deploy`.
- The `project` field in `apps/{app,api}/trigger.config.ts` patched to your
  project ref (upstream hard-codes trycomp.ai's project ID).
- Workspace `node_modules` populated in the deploy container; **bun install
  segfaults** on this monorepo (memory issue), so use `node:22-slim` + `npx`.
- The `oven/bun:*` image has stale CA certs that fail TLS to depot.dev (the
  remote build service); `node:22-slim` has fresh certs.
- All env vars from `apps/app/.env` passed via `--env-file` so the local
  `next/env` validation passes.
- The `syncEnvVars` build extension to push env vars to the project so the
  remote indexer (which evaluates each task module) doesn't throw on
  `new URL(process.env.X)` calls in dependencies.

Even with all of that, we hit `Invalid URL in src/trigger/tasks/.../*.ts`
errors during indexer evaluation that we couldn't trace to a specific source.

**The pragmatic workaround:** skip Trigger.dev deploy entirely.
`initializeOrganization` runs synchronously during onboarding and clones
framework templates → Control / Policy / Task rows for the org. The
dashboard works fine without the AI-tailoring background layer. Run
`selfhost/post-onboarding.sql` after the user finishes the wizard to clear
the warning banner:

```bash
docker compose exec -T db psql -U comp -d comp \
  -v ORG_ID="'org_xxxxxxxxxxx'" \
  -f selfhost/post-onboarding.sql
```

What you lose without Trigger workers running:
- AI-rewritten policy text (custom to the org's stack)
- Auto-generated risks
- Vendor research / trust-portal scraping
- Scheduled access reviews, evidence collection, integration syncs
- Quarterly task reminders, weekly task digest emails

Manual UI clicks ("Generate policy", "Add vendor", etc.) still work because
they hit the api directly, not via Trigger.

### 5. SSH starves on memory pressure during builds

When the box is doing a heavy Bun + Next.js build, sshd gets evicted to
swap and stops responding to new connection banner exchange — even though
TCP `connect` to port 22 succeeds. `aws cloudwatch get-metric-statistics`
on `CPUUtilization` is the only reliable signal that the box is alive.

**Mitigation:** stop running app/portal/api containers before kicking off
a multi-stage rebuild, so the build has the full 8 GB to itself. Restart
the containers after.

### 6. Anthropic model is hardcoded across the api dist

`api-patch.sh` rewrites `claude-sonnet-4-6` and `claude-opus-4-6` references
to `claude-opus-4-7`. The hardcoded files are:
- `dist/src/browserbase/browserbase.service.js`
- `dist/src/cloud-security/ai-remediation.service.js`
- `dist/src/questionnaire/utils/content-extractor.js`
- `dist/src/trigger/vector-store/helpers/extract-content-from-file.js`
- `dist/src/trigger/vendor/vendor-risk-assessment/trust-portal-deep-scrape*.js`

Cost note: `claude-opus-4-7` is ~5× the price of Sonnet for input/output
tokens. Vendor-research crawls and questionnaire flows can burn fast.
Edit `api-patch.sh` to keep Sonnet if you want cheaper.

### 7. The auth UI is magic-link-first

`/auth` doesn't expose an email+password tab. With Resend unwired, users
can submit their email and the api returns 200, but no email is sent.
The magic-link URL is logged to stdout via `api-patch.sh`'s email stub:

```bash
docker logs --since 30s compliance-api-1 | grep -A 1 "MAGIC LINK"
```

For real customers, wire Resend (verify a domain you own, drop the key
into all 3 `.env` files, then drop the `sendMagicLink` / `sendVerificationOTP`
replacement block from `api-patch.sh` so real emails are sent).

### 8. Filing upstream — full PR list

In addition to the original 4 Dockerfile fixes, this branch also fixes
or works around:
- `Dockerfile` migrator stage missing `@prisma/adapter-pg` + `pg`
  (seeder fails with `Cannot find module '@prisma/adapter-pg'`)
- `packages/db/prisma/seed/seed.ts` Prisma-client-path resolution mismatch
- `apps/api/src/security-penetration-tests/security-penetration-tests.service.ts`
  hard-throws on missing `MACED_API_KEY`
- `apps/api/src/auth/auth.server.ts` `getCustomDomains` constructs an Upstash
  client at module-init that throws on empty `UPSTASH_REDIS_REST_URL`
- `apps/{app,api}/prisma/client.ts` and `packages/db/src/client.ts` treat any
  non-`localhost` host as needing TLS-with-CA verification
- `apps/api/src/main.js` helmet defaults block cross-origin from app:3000 →
  api:3333
- `apps/{app,api}/trigger.config.ts` hard-codes trycomp.ai's project ref
  rather than reading from `TRIGGER_PROJECT_REF`
