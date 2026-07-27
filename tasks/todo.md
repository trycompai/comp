# CS-727 — Risks module updates (Clauses 6.1.2 + 6.1.3)

Branch: `tofik/cs-727-feature-risks-module-updates` · Worktree: `.worktrees/cs-727-risks-module` · DB: `compdev_cs_727_risks_module`

## Plan — all done

- [x] `RiskAcceptance` append-only model (risk XOR vendor, frozen residual + acceptor name, CHECK constraint) + `IsmsDocumentType` += `risk_assessment_methodology`, `risk_treatment_plan` (migration `20260723195431`)
- [x] Acceptance endpoints: GET/POST `/v1/risks/:id/acceptances` + `/v1/vendors/:id/acceptances`; server risk-level mirror of `apps/app/src/lib/risk-score.ts`; stale computed on read
- [x] 11th ISMS type `risk_assessment_methodology`: fully templated editable narrative, fixed scale labels, computed color-coded 5x5 matrix (renderers gained optional `cellFills`), seeded via ensure-setup heal, drift `[]`
- [x] 12th ISMS type `risk_treatment_plan`: renders live from Risk Register + vendors (extras threaded at BOTH snapshot sites), drift via `riskTreatmentFingerprint`, owner submit gate, `GET /v1/isms/documents/:id/risk-treatment` page payload
- [x] Frontend: acceptance card + record dialog on risk & vendor treatment-plan tabs; RiskMethodologyClient/Form; RiskTreatmentPlanClient preview; all 5 exhaustive maps wired
- [x] Tests: acceptance service/controller, methodology + RTP builders, export-data loader, drift; app: acceptance card + RTP table
- [x] Verify: API+app typecheck (only documented pre-existing errors), scoped jest 598 ISMS + 45 risks green, app build (Vercel gate) green, PDF/DOCX samples rendered from the reference dataset and reviewed

## Review notes

- Failing suites in the touched areas were baselined against origin/main components: identical failures (nuqs adapter env issue etc.) — none caused by this change. `update-vendor.dto.spec` fails to LOAD in this environment (prisma client TLS check at import); its import chain contains no changed file.
- Deliberate divergences from the ticket (flagged in the PR + Linear):
  1. Risk levels use the platform's real 5-band scale (Very low…Very high), not the ticket's Low/Medium/High/Critical.
  2. Treatment options = platform strategies labeled with their ISO 27001 names (Mitigate=Modify, Transfer=Share, Accept=Retain).
  3. No stored "critical vendor" flag exists → the supplier table includes ALL vendors.
  4. RTP tables follow the attached reference sample (9 columns; register status summarized in each intro) rather than the ticket's 10-column sketch.
  5. Residual likelihood/impact always carry a value (schema defaults) → "residual set" gates are inherently satisfied; the submit gate = ≥1 risk + owner on every risk/vendor.
  6. Archived risks are excluded from the plan.
- OpenAPI json not regenerated (CS-698/701/723/726 precedent; spec pipeline reads main).
