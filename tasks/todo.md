# Pentest v1 — end-to-end rebuild (single PR)

## Goal

Ship pentest v1 in **one PR** with everything working end-to-end against real Maced:

- Every org has 1 free trial run (single flag to change the number)
- Uses `@maced/api-client` SDK — no homegrown HTTP client or schemas
- Real-time status via Maced's signed webhooks (HMAC verification via SDK)
- Full audit trail via existing `AuditLog`
- Existing UI kept; only add credit-balance display + button gating
- All dead/outdated code removed in the same PR

## Out of scope (v2 — separate plan)

- Stripe subscriptions / Checkout / paid plans
- Top-up purchases, overage billing
- Stripe customer portal
- Credit-history ledger table (add if needed when top-ups land)

## Guiding principles

- **No new tables.** Extend `pentest_subscription`; reuse `AuditLog`.
- **Flexibility lives in one place per concern.** Trial grant amount = one flag. Trial grants on org-create = one hook.
- **SDK types are the source of truth** — delete every homegrown Maced type / Zod schema.
- **Every piece must work end-to-end against real Maced before PR is opened** — not a stack of hopes-to-work.

---

## Work breakdown (ordered; build + verify each phase locally before moving on)

### Phase 1 — Clean the old code we're replacing

- [ ] Delete `apps/api/src/security-penetration-tests/maced-client.ts` (homegrown HTTP client + Zod schemas — replaced by SDK).
- [ ] Delete `apps/api/src/security-penetration-tests/pentest-billing.controller.ts`.
- [ ] Delete `apps/api/src/security-penetration-tests/pentest-billing.service.ts`.
- [ ] Delete `apps/app/src/app/api/webhooks/stripe-pentest/route.ts`.
- [ ] Delete the dead webhook-handshake code still in `security-penetration-tests.service.ts` (everything related to `verifyAndRecordWebhookHandshake`, `webhookHandshakeSecretName`, `parseWebhookHandshake`, `PersistedWebhookHandshake` — fully replaced in Phase 4).
- [ ] Remove `STRIPE_PENTEST_SUBSCRIPTION_PRICE_ID`, `STRIPE_PENTEST_OVERAGE_PRICE_ID`, `STRIPE_PENTEST_WEBHOOK_SECRET` references from `apps/api/.env.example` and `comp-private/apps/infra/index.ts`.
- [ ] Remove the frontend billing-actions Stripe CTAs from `apps/app/src/app/(app)/[orgId]/settings/billing/billing-actions.tsx` (or collapse the file to a "Trial" read-only display).
- [ ] Delete (or port to SDK) `apps/api/test/maced-contract.e2e-spec.ts` and re-enable `.github/workflows/maced-contract-canary.yml` if ported.

**Verify:** project typechecks; tests that reference deleted files are removed or updated. UI loads (will have reduced functionality temporarily until Phase 3+).

### Phase 2 — Swap to `@maced/api-client`

- [ ] Initialize `createMacedClient({ apiKey: process.env.MACED_API_KEY! })` as a singleton in `SecurityPenetrationTestsService`.
- [ ] Replace every Maced call with SDK methods:
  - `maced.pentests.create(...)` → `createReport()`
  - `maced.pentests.list(...)` → `listReports()`
  - `maced.pentests.retrieve(id)` → `getReport()`
  - `maced.pentests.progress(id)` (verify SDK method name) → `getReportProgress()`
  - Report markdown + PDF → SDK's equivalent (verify streaming API)
- [ ] Use SDK-inferred types everywhere (`z.infer<...>` imports go away).
- [ ] In `createReport()`, keep the backfill pattern (create response is lean by Maced's documented contract).
- [ ] Update `apps/api/src/security-penetration-tests/README.md` to reference the SDK as the source of truth.

**Verify:** create a real pentest via the UI against dev-tier Maced → 201, run appears in list, detail page loads, polling works, markdown/PDF download works.

### Phase 3 — Credit system (v1 trial gate)

#### DB migration (one migration file, multiple changes)

- [ ] Migration `add_pentest_trial_credits_and_pentest_audit_type`:
  - `pentest_subscription.stripeSubscriptionId` → nullable
  - `pentest_subscription.stripePriceId` → nullable
  - `pentest_subscription.organizationBillingId` → nullable
  - Add `pentest_subscription.runsRemaining Int @default(1)`
  - Add `pentest_subscription.planType String @default("trial")` (values: `"trial"`, `"subscription"` — string, not enum, for easy extension)
  - Add `pentest` to `AuditLogEntityType` enum
- [ ] Backfill step in the same migration: insert a `pentest_subscription` row for every existing `Organization` with no row, `{ runsRemaining: 1, planType: 'trial', status: 'active', currentPeriodStart: now(), currentPeriodEnd: now() + 100 years }`.

#### Audit plumbing

- [ ] Add `pentest: AuditLogEntityType.pentest` to `RESOURCE_TO_ENTITY_TYPE` in `apps/api/src/audit/audit-log.constants.ts`.

#### Trial-grant config (single knob)

- [ ] Helper `apps/api/src/security-penetration-tests/trial-grant.ts` → `getTrialGrantAmount(): Promise<number>`. Reads PostHog numeric flag `pentest-trial-grant`, falls back to `process.env.PENTEST_TRIAL_GRANT`, final fallback `1`.
- [ ] Single call site for granting credits to a new org (see next section).

#### Org-create hook

- [ ] Audit where new organizations are created (`OrganizationsService.create()`, onboarding flow, or Better Auth post-registration hook). Add a single call: `creditsService.grantInitialTrial(orgId)`.

#### Credits service

- [ ] New `apps/api/src/security-penetration-tests/pentest-credits.service.ts`:
  - `getBalance(orgId): Promise<{ runsRemaining, planType }>`
  - `debit(orgId, runId): Promise<void>` — atomic decrement inside a transaction; throws `HttpException(402)` if balance would go negative.
  - `grant(orgId, amount, reason): Promise<void>` — increment; logged via Nest logger.
  - `grantInitialTrial(orgId): Promise<void>` — idempotent; looks up the grant amount via `getTrialGrantAmount()` and upserts the row. Safe to call for existing orgs.
  - `refund(orgId, runId, reason): Promise<void>` — increment + Nest logger. Used by the webhook handler on `pentest.failed`.

#### Credits controller

- [ ] New `apps/api/src/security-penetration-tests/pentest-credits.controller.ts`:
  - `GET /v1/pentest-credits/status` → `{ runsRemaining, planType }` — gated `@RequirePermission('pentest', 'read')`.
  - No mutation endpoints in v1 (all grants are server-driven).

#### Service integration (create path)

- [ ] Rewrite `createReport()` to:
  1. Check balance → throw 402 if `runsRemaining === 0`.
  2. Call Maced SDK create → get `{ id, status }`.
  3. In a Prisma `$transaction`: `persistRunOwnership` + `creditsService.debit`. Rollback both on either failure.
  4. Return backfilled response.
- [ ] On the failure path, if Maced created the run but we failed to persist, log loudly (`logger.error`) with enough context to reconcile manually; don't automatically refund the user (they got lucky — run exists at Maced).

#### Frontend wiring

- [ ] New hook `usePentestCredits(orgId)` in the existing hooks dir → `useSWR('/v1/pentest-credits/status')`.
- [ ] `penetration-tests-page-client.tsx`:
  - Show `"Your trial: X run(s) remaining"` near the page header or inside the dialog.
  - Disable **Create Report** (and the dialog's "Start penetration test") when `runsRemaining === 0`.
  - Empty-state copy swap: "You've used your trial. Paid plans coming soon." when balance is 0 and no runs exist.
- [ ] Remove or stub `/settings/billing` page's Stripe-dependent sections; replace with "Trial — 1 free run per org" read-only display for now.

**Verify:** new org has a row; existing orgs get backfilled to 1; 402 fires before Maced is called when balance is 0; debit happens atomically on success; UI shows balance + disables button; `AuditLog` has entries for every create/read/delete with `entityType=pentest`.

### Phase 4 — Webhook verification via SDK

- [ ] On service boot (`onModuleInit`): fetch webhook secret via SDK (`maced.webhooks.secret()` or equivalent) → cache in a module-scoped variable. Log on failure; retry on next webhook receipt if the cache is empty.
- [ ] Rewrite `SecurityPenetrationTestsService.handleWebhook()`:
  1. Read the signature header (exact header name from SDK docs — probably `X-Maced-Signature`).
  2. Pass raw body + signature + secret into SDK's `verifyMacedWebhook` (or equivalent). **Need raw body** — configure NestJS to preserve raw body for this route (similar to the Stripe webhook pattern).
  3. On signature invalid → 401 Unauthorized.
  4. Parse validated payload for `{ runId, status, ... }`.
  5. Map `runId` → org via `security_penetration_test_runs`. If ownership not found → 404.
  6. Update run status (local cache / emit SSE, or just log for v1 — polling already covers the UI).
  7. If event is `pentest.failed` → call `creditsService.refund(orgId, runId, 'scan_failed')` so the user isn't charged for Maced's failure.
  8. Write an `AuditLog` entry for the event (system user convention — pick whatever the repo uses elsewhere for system-initiated audits).
- [ ] Delete everything related to the phantom handshake — `verifyAndRecordWebhookHandshake`, `webhookHandshakeSecretName`, `parseWebhookHandshake`, `PersistedWebhookHandshake`, the `secret`-table write/read for handshake tokens.
- [ ] Keep polling as the UX path for status — no frontend change needed in v1 beyond what Phase 3 added.

**Verify:** tunnel a real Maced webhook into localhost (ngrok); signature verification passes for valid, fails for tampered; `pentest.failed` refunds; invalid run ID → 404.

### Phase 5 — Tests

- [ ] **Service unit tests** (Jest) — rewrite `security-penetration-tests.service.spec.ts` to:
  - Mock `@maced/api-client` module.
  - Cover: 402 when balance 0, debit on success, rollback on txn failure.
  - Webhook: valid signature, invalid signature, tampered payload, unknown run, failed event refund.
- [ ] **Controller unit tests** — cover credits controller + existing controller.
- [ ] **Credits service tests** — balance read, atomic debit (simulate concurrent), grant, refund, idempotent trial grant.
- [ ] **Frontend tests** — Vitest for hooks + page: balance shown, button disabled at 0.

### Phase 6 — Final verification (against dev Maced)

- [ ] Clean local DB; run the migration; confirm backfill.
- [ ] Create a run via UI → 201, row in DB with `runsRemaining = 0` after debit.
- [ ] Try to create another → 402, "Create Report" disabled in UI.
- [ ] Tunnel Maced webhook via ngrok → completion event arrives, verified, logged.
- [ ] Force a failure scenario (target URL that should fail / testMode=true?) → `pentest.failed` webhook → credit refunded → UI shows `runsRemaining = 1` again.
- [ ] Check `AuditLog` rows: create, read, delete, refund, grant all present.

---

## Risks & open items to answer during implementation

- **Raw body for webhook verification.** NestJS's global `ValidationPipe` + JSON parser will have already consumed the body by the time we reach the handler. Need to register a raw-body middleware/interceptor for the webhook route *only* (similar to how Stripe webhooks are handled elsewhere in the codebase — reuse that pattern).
- **Org-create hook location.** Have to find the exact spot during implementation. Candidates: `OrganizationsService.create()`, the onboarding flow, a Better Auth post-registration hook.
- **PostHog numeric flag tier availability.** Confirm plan supports it; if not, env-var-only is fine for v1.
- **SDK method names.** Plan assumes `maced.pentests.create/list/retrieve/progress`, `maced.webhooks.secret`, `verifyMacedWebhook`. Must verify at Phase 2 kickoff by inspecting the installed package's types.
- **Transactional debit.** If Prisma `$transaction` fails after Maced succeeded, the run exists at Maced but not in our DB → the user sees nothing, we owe Maced. For v1: log loudly; reconcile manually. v1.5: background reconciliation job.
- **Webhook → UI live updates.** v1 relies on polling (which already works). If we want push updates, add SSE later. Not in scope for this PR.

---

## Review (fill in after PR is opened)

_Add: what surprised us about Maced's real responses, what had to change from this plan, what we should revisit in v2._
