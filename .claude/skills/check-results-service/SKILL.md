---
name: check-results-service
description: How to reuse ANY integration check's results in a feature via the universal CheckResultsService (apps/api integration-platform). Use whenever a feature needs data produced by an integration check — "show 2FA status on People", "surface AWS S3 findings in X", "reuse a check's results", "per-user/per-resource results from a connected integration", "which integrations feed task T". Read this BEFORE writing your own IntegrationCheckResult / CheckRunRepository query — don't hand-roll it.
---

# CheckResultsService — reuse any integration check's results

## The one idea

Integration checks (2FA, AWS S3 encryption, device posture, …) all write per-resource
results to one table (`IntegrationCheckResult`). **`CheckResultsService` is the single,
universal, read-only way to get those results into any feature.** It is deliberately
**feature-agnostic**: it fetches results and hands them back in a stable envelope, and it
does **not** know or care what the data means.

> **Service = fetch the results (generic). Feature = interpret + map + present.**

If you're about to query `IntegrationCheckResult` or `CheckRunRepository` directly from a
new feature — stop. Use this service instead.

- Service: `apps/api/src/integration-platform/services/check-results.service.ts`
- Exported from `IntegrationPlatformModule` — inject it into any feature module.
- Reference consumer (copy this): the 2FA feature — `two-factor-source.controller.ts`.

## When to use it

Use it whenever a feature needs the output of an integration check:
- "Show each employee's 2FA status on the People tab" (the current consumer)
- "Surface which S3 buckets failed encryption inside feature X"
- "Show device compliance per user from the MDM check"
- "List which connected integrations can supply data for task T"

## The API (3 methods)

```ts
// 1. Discover sources: which connected integrations can feed a task, + connection state.
listSourcesBoundToTask(organizationId, taskTemplateId): Promise<CheckSourceInfo[]>

// 2. The primitive: full results of a check's latest REAL run for ONE connection.
getLatestResultsByCheck({ organizationId, connectionId, checkId, resourceType? }): Promise<CheckResultRow[]>

// 3. Convenience: results for a task-bound check from a chosen source (provider slug).
//    Resolves task -> check and slug -> connection for you.
getLatestResultsForTask({ organizationId, taskTemplateId, sourceSlug, resourceType? }): Promise<CheckResultRow[]>
```

Notes:
- "Latest REAL run" = newest run that isn't `inconclusive`/held and whose connection isn't
  disconnected. Held runs (our-side self-heal) never leak to a feature.
- No row cap — you get the full result set (unlike the 30-row task-history display).
- `resourceType` filters rows (e.g. `'user'`, `'bucket'`). Omit to get all.
- Empty array = "no data" (source not bound/connected, or never really ran). Never throws
  for "no results".

## Person-scoped results: the shape contract

Checks about PEOPLE (employee access, 2FA/MFA, training) follow a standard emission shape —
this section is the canonical definition of it:

- **One row per person** — never a single aggregate row with a roster buried in `evidence`.
- **`resourceType: 'user'`** (exactly this string).
- **`resourceId` = the person's email, lowercased + trimmed.** Fallback `username || id`
  only when the provider genuinely exposes no email (such rows won't join to members —
  acceptable, still visible in evidence views).
- **`evidence`** carries what the provider knows: `email`, `name`, `role`, `isAdmin`,
  `status`, `lastLogin`, plus a `checkedAt` timestamp.
- **Access/inventory rows always emit as pass** (having access is information, not a
  violation); compliance-gate checks (2FA, training) pass/fail per person; error paths
  (bad creds, missing scopes) stay org-level rows.

So a feature joining check results to org members does exactly this — no parsing, no AI:

```ts
const rows = await checkResults.getLatestResultsForTask({
  organizationId, taskTemplateId, sourceSlug, resourceType: 'user',
});
const forMember = rows.filter((r) => r.resourceId === member.email.toLowerCase());
```

If a source returns zero `'user'` rows, its check hasn't been normalized to the standard
yet (or genuinely has no per-person data) — render that as "no per-person data from this
source", and fix the CHECK to emit the shape above. Never work around it by parsing
aggregate evidence in the feature.

## The envelope you get back

```ts
interface CheckResultRow {
  resourceId: string;      // provider-native id: email (2FA), bucket ARN (S3), repo, …
  resourceType: string;    // 'user' | 'bucket' | …
  passed: boolean;         // did this resource pass the check
  title: string;
  description: string | null;
  evidence: Prisma.JsonValue;  // ← check-SPECIFIC payload. The service does NOT interpret it.
  collectedAt: Date;
  runId: string;
  connectionId: string;
}
```

**The `evidence` rule (important):** the envelope is universal; the check-specific data lives
in `evidence` as raw JSON. The service never types or interprets it. **Your feature validates
`evidence` at its own edge with a zod schema** and reads only the fields it understands:

```ts
const TwoFaEvidence = z.object({ isEnrolledIn2Sv: z.boolean() });
const parsed = TwoFaEvidence.safeParse(row.evidence);
// use parsed.data.isEnrolledIn2Sv — never `as any`
```

For a simple pass/fail feature you often don't even need `evidence` — just use `row.passed`
and `row.resourceId` (that's all 2FA needs).

## How to add a NEW consumer (step by step)

Say a feature wants "which AWS S3 buckets failed encryption":

1. Inject the service: add `CheckResultsService` to your feature's constructor (the module
   already exports it; import `IntegrationPlatformModule` if your module doesn't already).
2. Get results with the primitive (S3 usually spans many AWS connections, so you may loop
   connections from `listSourcesBoundToTask` or your own connection lookup):
   ```ts
   const rows = await this.checkResults.getLatestResultsByCheck({
     organizationId,
     connectionId,
     checkId: 'aws-s3-encryption',   // the check's manifest id
     resourceType: 'bucket',
   });
   ```
   …or, if your feature lets the user PICK a source for a task (like 2FA does), use
   `getLatestResultsForTask` with the task template id and the chosen `sourceSlug`.
3. Interpret in YOUR feature: map `resourceId`/`passed`, validate `evidence` with zod, shape
   the response your UI needs. **Do not** add feature logic to the service.
4. Test with the service mocked (see `two-factor-source.controller.spec.ts`).

## Worked example — the 2FA feature (reference implementation)

The People-tab 2FA column is consumer #1. Study it end to end:

- `two-factor-source.controller.ts`
  - `available-2fa-sources` → `listSourcesBoundToTask(org, TASK_TEMPLATES.twoFactorAuth)`
  - `two-factor-statuses` → `getLatestResultsForTask({ org, taskTemplateId: twoFactorAuth,
    sourceSlug: org.twoFactorSource, resourceType: 'user' })`, then maps `resourceId`→email
    (lowercased) and `passed`→`enabled`/`missing`. Emails with no row are resolved to
    "Not provided" on the client, never a false "missing".
- The controller owns the 2FA-specific bits (the `Organization.twoFactorSource` column, the
  enabled/missing interpretation). The generic fetch is all in the service.

## Rules / do & don't

- ✅ DO put every "read a check's results" path through this service.
- ✅ DO validate `evidence` with zod in your feature. No `as any`.
- ✅ DO treat an empty array as "no data / not provided" — never a failure.
- ❌ DON'T query `IntegrationCheckResult` / `CheckRunRepository` directly from a feature.
- ❌ DON'T add feature-specific interpretation (enabled/missing, domain mapping) to the
  service — it must stay universal and read-only.
- ❌ DON'T assume a source produces per-`user` (or email-keyed) rows — that's per-check. If a
  chosen source's check emits a different `resourceType` or a non-mappable `resourceId`, your
  feature should degrade gracefully (e.g. "Not provided"), not crash.

## Source selection is NOT part of this service

Which integration an org uses for a purpose (e.g. `Organization.twoFactorSource`) is
feature-owned config, mirroring `employeeSyncProvider` / `deviceSyncProvider`. Add a column
per feature. (If a 3rd/4th feature needs it, consider generalizing selection then — not
before.)
