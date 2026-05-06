# Secure RDS TLS — Deploy Checklist

## Vercel (apps/app and apps/portal)

**No env var or `outputFileTracingIncludes` config required.** The AWS RDS CA
bundle is inlined as a TypeScript constant (`RDS_CA_BUNDLE`) and passed
directly to the Postgres adapter via `ssl.ca`. This works under both Webpack
and Turbopack since it's just a string the bundler always emits.

Background: `outputFileTracingIncludes` is silently no-op'd under Turbopack
(`next/dist/build/index.js` line ~1537 gates `collectBuildTraces` on
`bundler !== Bundler.Turbopack`). All current Vercel deployments use Turbopack
(metadata `bundler: "turbopack"`), which is why the file-based approach from
PR #2761 failed in production for app-router page routes.

If `NODE_EXTRA_CA_CERTS` is still set as a shared/team Vercel env var,
**unset it** — when the path doesn't exist on the function, Node logs a
`Warning: Ignoring extra certs from … load failed: error:80000002:system
library` for every cold start.

## Trigger.dev (api and app projects, staging + prod)

The `caBundleExtension` and `NODE_EXTRA_CA_CERTS` setup in `trigger.config.ts`
remain as-is — Trigger.dev images bake the cert into
`/app/certs/rds-global-bundle.pem`. The shared `@trycompai/db` client falls
through to verified TLS via the inline bundle either way.

If `PRISMA_ALLOW_INSECURE_TLS` is still set as a leftover from earlier
debugging, remove it:

```bash
bunx trigger.dev@4.4.3 envvars remove PRISMA_ALLOW_INSECURE_TLS --env staging
bunx trigger.dev@4.4.3 envvars remove PRISMA_ALLOW_INSECURE_TLS --env prod
```

## API Docker (apps/api)

No action — `apps/api/Dockerfile.multistage` already installs the RDS CA bundle
and sets `NODE_EXTRA_CA_CERTS` at the system level. `apps/api/prisma/client.ts`
still consults the env var, which is the correct path for that runtime.

## Downstream consumers (comp-private/apps/enterprise-api, etc.)

After bumping `@trycompai/db` to a version that includes the inline bundle,
consumers that import `resolveSslConfig` from `@trycompai/db/ssl-config`
automatically get verified TLS via the inline bundle — no env var required.
They can drop their own `NODE_EXTRA_CA_CERTS` and `outputFileTracingIncludes`
on the new version.

## Regenerating the inlined CA bundle

When AWS rotates the RDS CA, replace the PEM and regenerate:

```bash
# overwrite packages/db/certs/rds-global-bundle.pem with the new bundle
node packages/db/scripts/generate-ca-bundle-ts.mjs
```

This rewrites the inlined `rds-ca-bundle.ts` in `packages/db/src` and in each
app's `prisma/` directory.
