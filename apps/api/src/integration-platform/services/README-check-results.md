# CheckResultsService — reuse any integration check's results

`CheckResultsService` is the **single, universal, read-only** way for any feature to consume
the output of an integration check (2FA, AWS S3, device posture, …). It fetches per-resource
results and returns them in a stable, feature-agnostic envelope. It does **not** interpret
the data — that's the feature's job.

> Service = fetch results (generic). Feature = interpret + map + present.

**Full usage map, examples, and rules:** see the `check-results-service` skill
(`.claude/skills/check-results-service/SKILL.md`).

## 30-second version

```ts
// inject CheckResultsService (exported by IntegrationPlatformModule), then:

// which connected integrations can feed a task, + connection state
await checkResults.listSourcesBoundToTask(orgId, TASK_TEMPLATES.twoFactorAuth);

// full results of a check's latest real run for one connection
await checkResults.getLatestResultsByCheck({ organizationId, connectionId, checkId, resourceType });

// results for a task-bound check from a chosen source (resolves task->check, slug->connection)
await checkResults.getLatestResultsForTask({ organizationId, taskTemplateId, sourceSlug, resourceType });
```

Each row is `{ resourceId, resourceType, passed, title, description, evidence, collectedAt,
runId, connectionId }`. The check-specific payload is `evidence` (raw JSON) — **validate it
with zod in your feature**; the service never types it. Empty array = "no data" (never throws).

## Finding ONE person in the results? Use EvidenceExtractionService

`evidence-extraction.service.ts` (same module, also exported) is the shared way to find a
specific person by email inside check results. Ladder: deterministic shape matching → email
pre-gate (email absent = confident not-found, no AI call) → Haiku fallback with a strict
schema for unknown shapes. Returns `{ status: 'found' | 'not-found' | 'unparsed', entries }`;
AI entries carry `source: 'ai'` and must be labeled in the UI. Never throws — AI failure
degrades to `unparsed`. Don't hand-roll email matching against `evidence` in a feature.

## Don't

- Don't query `IntegrationCheckResult` / `CheckRunRepository` directly from a feature — use this service.
- Don't add feature-specific interpretation to the service — keep it universal and read-only.
- Don't write your own person-in-evidence parser — use `EvidenceExtractionService`.

## Reference consumers

- The People-tab 2FA column: `../controllers/two-factor-source.controller.ts` (deterministic, org-wide).
- The member Access tab: `apps/api/src/people/people-access.service.ts` (person-scoped, uses the extraction ladder).
