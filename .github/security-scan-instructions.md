# Security review — repo-specific instructions

Multi-tenant compliance SaaS: NestJS API (`apps/api`), Next.js app (`apps/app`),
Prisma (`packages/db`), better-auth (auth lives in the API). Apply these
high-signal, repo-specific checks in addition to the standard vulnerability
classes. Verify against the actual code (guard → controller → service → DB); do
not speculate.

## Access control (highest priority)
- Every mutation endpoint (POST/PATCH/PUT/DELETE) must have
  `@UseGuards(HybridAuthGuard, PermissionGuard)` + `@RequirePermission('resource','action')`.
  `@Public()` only on webhooks.
- API-key requests are authorized by `request.apiKeyScopes`; service tokens by the
  service's own `permissions`. Flag any authorization decision derived from a
  *resolved / attributed* user rather than the credential's own scopes.
- **Authz ≠ attribution:** the output of `ActingUserResolver.resolve()`
  (`acting.userId` / `acting.memberId`) may be used ONLY for audit rows,
  `createdBy`, or assignment — never to grant a permission.
- **IDOR:** any lookup/update/delete by a client-supplied id
  (`@Param`/body) must also be scoped so the caller can only reach their own
  org's row.

## Multi-tenant isolation
- Every Prisma query must be scoped by `organizationId`, and that value must come
  from the auth context (`@OrganizationId()` / `request.organizationId`), NEVER
  from a client-supplied body/param/header — except the validated
  `x-organization-id` service-token path.

## Repo hotspots
- **SSRF:** server-side fetch to a user-controlled URL — vendor website research
  (Trigger.dev jobs), integration/cloud connectors, webhooks. Require scheme/host
  validation and blocking of internal/link-local ranges.
- **Secrets:** no hardcoded or logged secrets/tokens; API responses must not leak
  keys; check the audit `data` JSON for secret/PII.
- **File uploads:** S3 presigned URLs scoped to the org prefix, content-type/size
  constrained, no public buckets, no path traversal in object keys.
- **Mass assignment:** spreading `...dto` / `...req.body` into `db.*.create/update`
  can let a caller set fields they shouldn't (status, ownerId, organizationId).
- **Non-repudiation:** security-relevant mutations should be audit-logged and
  attributed; API-key / service-token actions carry a `via API key "…"`
  provenance marker.

## Do NOT flag (known-safe patterns)
- The `...(authContext.userId && { authenticatedUser })` response-echo pattern —
  it is not attribution.
- Org-scoped Prisma queries, parameterized/tagged-template queries, and
  attribution-only use of the resolved actor.
