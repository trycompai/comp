## Self-hosting Comp (Apps + Portal)

This file is a brief overview for Docker-based self-hosting.

**For the detailed, up-to-date guide, see:**

- [Docker Self-Hosting Guide](https://trycomp.ai/docs/self-hosting/docker)
- [Environment Reference](https://trycomp.ai/docs/self-hosting/env-reference)

### Quick Summary

Docker uses **separate env files** (not a root `.env`):

| File | Services |
|------|----------|
| `packages/db/.env` | migrator, seeder |
| `apps/app/.env` | app |
| `apps/portal/.env` | portal |

### Minimal Required Environment

For a functional deployment:

- **Database**: `DATABASE_URL` in all three env files
- **Auth**: `AUTH_SECRET`, `SECRET_KEY`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` (app); `BETTER_AUTH_SECRET` (portal)
- **Email**: `RESEND_API_KEY` in app and portal
- **Workflows**: `TRIGGER_SECRET_KEY` in app
- **Misc**: `REVALIDATION_SECRET`, `NEXT_PUBLIC_PORTAL_URL` in app

### Prerequisites

- Docker Desktop or Docker Engine
- External PostgreSQL 14+ with SSL
- [Resend](https://resend.com) account for email
- [Trigger.dev](https://cloud.trigger.dev) account for workflows

### Build & Run

```bash
# 1. Create env files from examples
cp packages/db/.env.example packages/db/.env
cp apps/app/.env.example apps/app/.env
cp apps/portal/.env.example apps/portal/.env
# Edit each with your production values

# 2. Export build args
export BETTER_AUTH_URL="https://app.yourdomain.com"
export BETTER_AUTH_URL_PORTAL="https://portal.yourdomain.com"

# 3. Build
docker compose build --no-cache

# 4. Migrate & seed
docker compose run --rm migrator
docker compose run --rm seeder

# 5. Start
docker compose up -d app portal
```

### Trigger.dev Deployment

Deploy tasks from your workstation (not inside Docker):

```bash
cd apps/app
bunx trigger.dev@latest login
bunx trigger.dev@latest deploy
```

### Troubleshooting

View logs to debug missing env vars:

```bash
docker compose logs app
docker compose logs portal
```

The Dockerfile sets `SKIP_ENV_VALIDATION=true` at build time, so missing variables only cause errors at runtime.

See the [full troubleshooting guide](https://trycomp.ai/docs/self-hosting/docker#troubleshooting) for common issues.
