# Secure RDS TLS — Deploy Checklist

After merging the secure-rds-tls PR, the following env vars must be set per environment.

## Vercel (apps/app and apps/portal)

Set on each Vercel project, all environments (Production + Preview + Development):

```
NODE_EXTRA_CA_CERTS=/var/task/packages/db/certs/rds-global-bundle.pem
```

Verified on staging (apps/app): `process.cwd()` is `/var/task/apps/app`, the cert is traced
into the deploy at `/var/task/packages/db/certs/rds-global-bundle.pem` (165408 bytes), and
`/api/health` succeeds end-to-end. The cert is bundled via `outputFileTracingIncludes` in
each app's `next.config.ts`.

## Downstream consumers (comp-private/apps/enterprise-api, etc.)

The CA bundle now ships with the published `@trycompai/db` package (added to the `files` array
in this PR). After the next `@trycompai/db` publish, downstream consumers can ship the cert with
their own Vercel/Docker/Trigger.dev builds without committing a copy.

For Vercel-deployed apps that install `@trycompai/db` from npm:

1. Bump the dependency to the version that includes `certs/`.
2. Add `outputFileTracingIncludes` to `next.config.{ts,mjs}`:
   ```ts
   outputFileTracingIncludes: {
     '/**/*': ['./node_modules/@trycompai/db/certs/rds-global-bundle.pem'],
   },
   ```
3. Set the Vercel env var:
   ```
   NODE_EXTRA_CA_CERTS=/var/task/node_modules/@trycompai/db/certs/rds-global-bundle.pem
   ```
4. Apply the same strict-TLS Prisma client logic (or import a shared helper from `@trycompai/db`).

## Trigger.dev (api and app projects, staging + prod)

After deploying with the `caBundleExtension` (already wired in `trigger.config.ts`), remove the
legacy opt-in that bypasses TLS verification:

```bash
bunx trigger.dev@4.4.3 envvars remove PRISMA_ALLOW_INSECURE_TLS --env staging
bunx trigger.dev@4.4.3 envvars remove PRISMA_ALLOW_INSECURE_TLS --env prod
```

## API Docker (apps/api)

No action — `apps/api/Dockerfile.multistage` already installs the RDS CA bundle and sets
`NODE_EXTRA_CA_CERTS` at the system level.
