# Secure RDS TLS — Deploy Checklist

After merging the secure-rds-tls PR, the following env vars must be set per environment.

## Vercel (apps/app and apps/portal)

Set on each Vercel project, all environments (preview + production):

```
NODE_EXTRA_CA_CERTS=/var/task/packages/db/certs/rds-global-bundle.pem
```

The cert is bundled into the deployed function via `outputFileTracingIncludes` in `next.config.ts`.
At Vercel runtime the function CWD is conventionally `/var/task`, so the path above is the first
candidate. If a preview deploy crashes with "Refusing to connect" or "ENOENT", the runtime cwd
isn't `/var/task` — try instead:

```
NODE_EXTRA_CA_CERTS=/vercel/path0/packages/db/certs/rds-global-bundle.pem
```

Both paths can be tested with a preview deploy. The wrong one produces an ENOENT error at boot;
the right one succeeds silently.

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
