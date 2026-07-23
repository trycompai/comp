# CS-727 — Risks module updates (Clauses 6.1.2 + 6.1.3)

Branch: `tofik/cs-727-feature-risks-module-updates` · Worktree: `.worktrees/cs-727-risks-module` · DB: `compdev_cs_727_risks_module`

## Plan

### Schema (one migration)
- [ ] `RiskAcceptance` append-only model (prefix `rska`): exactly one of riskId/vendorId, acceptedById → Member (SetNull) + frozen `acceptedByName`, optional notes, frozen `residualLikelihood`+`residualImpact` at acceptance, `createdAt` server-set. Stale = frozen residual ≠ current residual (computed, never mutated).
- [ ] `IsmsDocumentType` enum += `risk_assessment_methodology`, `risk_treatment_plan` (ALTER TYPE ADD VALUE — don't use new values in same migration).

### Tweak 3 — acceptance API
- [ ] POST/GET `/v1/risks/:id/acceptances` (risk:update / risk:read) + same for vendors (vendor:*). No PATCH/DELETE (immutable).
- [ ] Server-side risk-level util mirroring `apps/app/src/lib/risk-score.ts` LITERALLY (CS-726 mirror lesson).
- [ ] Latest acceptance + stale flag computed in GET risk/vendor responses (or acceptance list endpoint).

### Tweak 1 — `risk_assessment_methodology` (11th type)
- [ ] Fully templated narrative doc: 12 sections per reference DOCX, adapted to the platform's REAL 5-band scale (very-low…very-high) + real treatment enum (mitigate/avoid/transfer/accept with ISO names Modify/Avoid/Share/Retain). Divergence from ticket text — flag in PR.
- [ ] Wire ALL exhaustive maps: EXPORT_SECTION_BUILDERS, TYPE_DRIFT_SOURCES, GENERATION_ORDER (wizard — easy to miss), seed templates, type definitions/meta.

### Tweak 2 — `risk_treatment_plan` (12th type)
- [ ] Data-driven doc from Risk register + vendor risks: preamble + org-risks table + supplier-risks table + outstanding acceptances + sign-off.
- [ ] "Critical vendor" = derived risk level (no stored flag) — decide threshold, flag in PR.
- [ ] Drift signal via TYPE_DRIFT_SOURCES (risks/vendors/acceptances fingerprint).
- [ ] Submit/generation gate: every risk + in-scope vendor has owner; residual set (NB: enum defaults mean "always set" — interpret + flag); acceptance NOT blocking → "Awaiting acceptance" rows.

### Frontend
- [ ] Risk detail: "Record risk-owner acceptance" action (RiskActions dropdown + treatment-plan tab display), modal (acceptor defaults to owner, changeable; notes), "Residual risk accepted by X on DATE at LEVEL", stale badge, history list.
- [ ] Vendor detail: same on VendorActions / treatment-plan tab.
- [ ] ISMS pages for both new types ([type] client components, submit gates mirrored).

### Tests + verify
- [ ] API jest: acceptance service/controller (immutability, stale, RBAC admin vs read-only), doc derivation/export, submit gates.
- [ ] App vitest: acceptance UI (permission-gated), ISMS clients.
- [ ] typecheck both; scoped suites green; `bun run --filter '@trycompai/app' build` (Vercel gate); real PDF+DOCX samples.

### Ship
- [ ] Push, adopt auto-PR via `gh pr edit`, PR body w/ design calls + divergences, Linear CS-727 → In Review.

## Review notes (fill at end)
