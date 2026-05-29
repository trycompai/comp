# ISMS Foundational Documents — Design (CS-437)

- **Ticket:** [CS-437 — Feature: A. Foundational documents](https://linear.app/compai/issue/CS-437)
- **Project:** ISMS Management-System Layer for ISO27001 (Release 1 = cross-cutting platform layer **J** + foundational documents **A**)
- **Sub-tickets:** CS-438 (wizard), CS-439 (Context 4.1), CS-440 (Interested Parties 4.2a), CS-441 (Requirements & Treatment 4.2b/c), CS-442 (Scope 4.3), CS-443 (Leadership 5.1), CS-444 (Objectives 6.2)
- **Status:** Approved (placement + IA + build/release strategy); ready for implementation
- **Date:** 2026-05-29

---

## 1. Problem

Customers and consultants hand-write the ISO 27001 Clause 4–6 management-system documents even though the platform already holds most of the underlying data (org profile, frameworks, vendors, members, controls, policies). This is the modal cause of Stage-1 findings on **4.1, 4.2, 4.3, 5.1, 6.2** (Pressmaster, Kidan). We need the platform to generate these as auditor-ready, branded, versioned, signed, exportable documents that stay current as the underlying data changes.

## 2. Goals / Non-goals

**Goals**
- Generate the six foundational documents from existing platform data, customer-branded, editable, exportable as **DOCX and PDF**, signed off and versioned like policies/SOA.
- Reproduce the Pressmaster/Kidan packs from platform output alone, closing findings 4.1/4.2/4.3/5.1/6.2.
- "Generate-and-edit, not generate-once": living artifacts that signal drift when source data changes.

**Non-goals (this ticket)**
- The broader ISMS layer (governance roles, monitoring, internal audit, management review — project work areas B–L). Built so those can slot in later, not built now.
- Re-authoring Annex A control content; new frameworks; localisation rollout (data model must be localisation-ready though).
- Re-grouping the existing evidence forms by framework (they're control-mediated/many-to-many — left as-is under their own tab).

## 3. Placement & Information Architecture (the load-bearing decision)

### 3.1 Critical evaluation of the options

Paul's ticket and project text **contradict each other**:

| Source | Says | Verdict |
|---|---|---|
| Ticket CS-437 | "A new **top-level ISMS section** in the navigation" | ❌ Wrong. The rail's top-level sections (Compliance, Security, Trust, Settings) are *products* gated by subscription/feature flags (`AppShellWrapper.tsx`). ISMS is the management-system layer of the ISO 27001 **compliance** offering, not a product. Violates the project's own principle #4. |
| Project description | "Compliance → ISMS Governance → Documents" | ✅ Closer — under Compliance. |
| Design principle #4 | "Sit **alongside Policies, not in a new silo**" | ✅ Authoritative. |

**Decision: none of the above verbatim — put it in the existing Documents page, grouped by framework.** The codebase proves why: the **Statement of Applicability already lives in `/[orgId]/documents`** (`statement-of-applicability/`) as an ISO 27001 ISMS document with auto-fill → edit → submit-for-approval → approve/decline → version → export. The six foundational documents are siblings of the SOA (all ISO 27001 management-system clause documents). Placing them anywhere other than next to the SOA would orphan the SOA and split the ISMS document set.

### 3.2 Grouping: by framework

The Documents page is **framework-grouped**. The whole platform is already framework-conditional (`FrameworkInstance`, per-framework Trust status, the SOA card only renders when ISO 27001 is active — principle #5). "ISMS" *is* ISO 27001 terminology (clauses 4–10), so the honest tab label is **`ISO 27001 (ISMS)`**.

```
Compliance → Documents
┌──────────────────────────────────────────────────────┐
│ [ ISO 27001 (ISMS) ] [ Company Forms ] [ Settings ]   │  ← ISO tab only if ISO 27001 active
├──────────────────────────────────────────────────────┤
│ Foundational Documents                          6      │
│   Context 4.1 · Interested Parties 4.2a · Scope 4.3    │
│   Leadership 5.1 · Objectives 6.2 · Req. Register 4.2bc│
│                                                        │
│ Statement of Applicability                      1      │  ← SOA moves under this tab
│   Annex A applicability (6.1.3)                        │
└──────────────────────────────────────────────────────┘
```

- Route stays `/[orgId]/documents`, gated `evidence:read` (same `requireRoutePermission('documents', orgId)` as today, same as SOA).
- Tabs rendered as **one tab per active framework that has a doc-pack** (today: ISO 27001) + Company Forms + Settings. Built to scale to N framework tabs; only ISO 27001 is populated now.
- The `ISO 27001 (ISMS)` tab and its cards are framework-conditional (visible iff ISO 27001 `FrameworkInstance` exists) **and** behind a rollout flag (§9).

### 3.3 Framework linkage is canonical, not bolted on

ISO 27001 clauses 4–10 already exist as `FrameworkEditorRequirement` rows in the seed (`"4.1 Context of the organization"`, `"4.2 …"`, `"4.3 …"`, `"5.1 Leadership"`, `"9.2/9.3 Performance"`, `"10.1 Improvement"`, …). So each foundational document maps **1:1 to its ISO 27001 clause requirement**, the same requirement model controls/policies/tasks already use. This yields:
1. Framework membership for free (`document → requirement → framework`).
2. The auditor "where is clause 4.1 evidenced?" link (project work area J) for free.
3. Per-clause drift/coverage reasoning.

> **To verify during implementation:** that clause **6.2 (objectives)** exists as an ISO 27001 requirement like 4.1/5.1 do. If absent, add it (custom/seed) or attach the Objectives doc to the framework instance directly.

> **Nuance:** control-mediated documents (the legacy evidence forms, via `ControlDocumentType → Control → FrameworkInstance`) are many-to-many across frameworks, so framework tabs are *filtered views, not exclusive buckets*. The foundational docs + SOA are ISO-27001-only and map 1:1, so this is clean for this feature.

## 4. Architecture

### 4.1 Engine: follow the SOA pattern, not the Policy/TipTap pattern

The documents are **structured, data-derived registers + saved narrative**, not free-form rich text. The SOA pattern (`apps/api/src/soa/*`, `apps/app/.../documents/statement-of-applicability/*`) is the template — closer than Policies:

| Concern | Reuse source |
|---|---|
| Auto-fill from platform data | SOA `ensure-setup` / `useSOAAutoFill` pattern |
| Edit + override (recorded) | per-row `source: derived \| manual` + audit log |
| Sign-off workflow (submit/approve/decline) | SOA `submit-for-approval` / `approve` / `decline` + `useSOADocument` |
| Versioning | Policy `PolicyVersion` + SOA `version`/`isLatest` |
| Drift signal | snapshot-vs-current hash (new) — analogous to policy `hasDraftChanges` |
| Export PDF + branding | `policy-pdf-renderer.service.ts` `getAccentColor(org.primaryColor)` |
| Export DOCX | **net-new** (`docx` npm package) |
| Detail-page tabs | `PolicyPageTabs` / `DocumentsPageTabs` URL-`?tab=` pattern |

### 4.2 Source data is canonical (principle #2, #6, #10)

Structured registers are **real tables** (queryable, per-row override, localisation-ready), not free text baked into a blob. The document artifact renders by combining registers + narrative sections. Derived rows carry `source='derived'`; user edits flip them to `source='manual'` and record the override. **Drift** = compare a snapshot of the derived source data (captured at last generate/approve) against current data; affected sections show "may be out of date" until reviewed/regenerated.

## 5. Data model (Prisma) — `packages/db/prisma/schema/isms.prisma`

> Prefixed CUIDs via `generate_prefixed_cuid('<prefix>')`. All scoped by `organizationId`.

```prisma
enum IsmsDocumentType {
  context_of_organization            // 4.1
  interested_parties_register        // 4.2a
  interested_parties_requirements    // 4.2b/c
  isms_scope                         // 4.3
  leadership_commitment              // 5.1
  objectives_plan                    // 6.2
}

enum IsmsDocumentStatus { draft in_progress needs_review approved declined }

model IsmsDocument {
  id                  String @id @default(dbgenerated("generate_prefixed_cuid('ismsd')"))
  organizationId      String
  frameworkInstanceId String                 // ISO 27001 instance
  requirementId       String?                // ISO clause requirement (4.1, 4.2, …)
  type                IsmsDocumentType
  title               String
  status              IsmsDocumentStatus @default(draft)
  approverId          String?                // Member
  approvedAt          DateTime?
  declinedAt          DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  organization      Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  frameworkInstance FrameworkInstance @relation(fields: [frameworkInstanceId], references: [id], onDelete: Cascade)
  versions          IsmsDocumentVersion[]
  contextIssues     IsmsContextIssue[]     // 4.1 register (slice 1)
  // 4.2/4.3/6.2 registers added with their sub-tickets

  @@unique([organizationId, frameworkInstanceId, type])
  @@index([organizationId, type])
}

model IsmsDocumentVersion {
  id             String   @id @default(dbgenerated("generate_prefixed_cuid('ismsv')"))
  documentId     String
  version        Int
  narrative      Json     // per-section saved narrative + section-level overrides
  sourceSnapshot Json     // snapshot of derived inputs at generate/approve (drift baseline)
  pdfUrl         String?
  docxUrl        String?
  publishedById  String?
  publishedAt    DateTime?
  createdAt      DateTime @default(now())

  document IsmsDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@unique([documentId, version])
}

// --- Slice 1 register: Context of the Organization (4.1) ---
enum IsmsContextIssueKind   { internal external }
enum IsmsContextSource      { derived manual }

model IsmsContextIssue {
  id            String @id @default(dbgenerated("generate_prefixed_cuid('ismsci')"))
  documentId    String
  kind          IsmsContextIssueKind
  description   String                 // the internal/external issue
  effect        String                 // effect on ISMS objectives (4.1 requires this)
  source        IsmsContextSource @default(derived)
  derivedFrom   String?                // provenance, e.g. "framework:ISO27001", "vendor:<id>"
  position      Int @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  document IsmsDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@index([documentId, kind])
}
```

**Subsequent registers (their sub-tickets):**
- `IsmsInterestedParty` (4.2a): name, partyType, source (`vendor|framework|member|manual`), derivedFrom, needs/expectations.
- `IsmsInterestedPartyRequirement` (4.2b/c): interestedPartyId, requirement text, ismsTreatment (linked policy/control id + note).
- `IsmsScope` (4.3): `certificateScopeSentence` (first-class, customer-approved), inScope narrative, interfaces[], dependencies[] (from vendors/sub-processors), exclusions[].
- `IsmsObjective` (6.2): objective, target, ownerMemberId, cadence, plan, measurementMethod, status.
- Leadership (5.1): narrative-only on the document version + wizard inputs; no separate register.

## 6. API (NestJS) — `apps/api/src/isms/`

`@Controller({ path: 'isms', version: '1' })`, `@UseGuards(HybridAuthGuard, PermissionGuard)`.

| Endpoint | Permission | Purpose |
|---|---|---|
| `POST /isms/ensure-setup` | `evidence:read` | Ensure the ISO 27001 instance + doc rows exist for the org; return statuses (mirrors SOA `ensure-setup`). |
| `POST /isms/documents/:type/generate` | `evidence:update` | Auto-fill a document's registers/narrative from platform data; capture `sourceSnapshot`. |
| `GET /isms/documents/:id` | `evidence:read` | Document + latest version + registers. |
| `PATCH /isms/documents/:id/issues/:issueId` (and register CRUD) | `evidence:update` | Override a derived row → `source=manual` (recorded). |
| `POST /isms/documents/:id/submit-for-approval` | `evidence:update` | Set approver, status `needs_review`. |
| `POST /isms/documents/:id/approve` \| `/decline` | `evidence:update` | Sign-off (approver only). |
| `GET /isms/documents/:id/drift` | `evidence:read` | Compare `sourceSnapshot` vs current derived data → per-section stale flags. |
| `POST /isms/documents/:id/export` `{ format: 'pdf' \| 'docx' }` | `evidence:read` | Render branded artifact; store `pdfUrl`/`docxUrl`. |

- **Permissions decision:** reuse the existing **`evidence`** resource (the `documents` route + SOA already sit on it). Avoids minting an `isms` resource now; revisit if/when the broader ISMS area (B–L) becomes its own section. `AuditLogInterceptor` logs automatically given `@RequirePermission`.
- Class-transformer gotcha: for endpoints receiving complex nested JSON, read `req.body` directly (per repo gotcha), don't rely on `ValidationPipe transform:true` for the narrative blob.

## 7. Export pipeline

- **PDF:** reuse `policy-pdf-renderer.service.ts` accent/branding (`getAccentColor(org.primaryColor)`, fallback `#004D3D`) and logo.
- **DOCX (net-new):** add the **`docx`** npm package; build `apps/api/src/isms/export/docx-renderer.ts` that renders the same structured content with org branding. Shared `export-generator.ts` dispatches `pdf|docx` from one `IsmsDocument` content shape (mirrors `soa/utils/export-generator.ts`, which currently hard-throws on non-pdf).

## 8. Frontend — `apps/app/src/app/(app)/[orgId]/documents/`

- **Tabs:** generalise `DocumentsPageTabs` to render framework tabs + Company Forms + Settings. Add `isms/` components under `documents/`.
- **ISO 27001 (ISMS) tab:** `IsmsOverview` with a *Foundational Documents* section (6 cards w/ status: Not started / Draft / Pending / Approved + drift badge) and a *Statement of Applicability* section (move the existing `SOAOverviewCard` here).
- **Document detail:** `documents/isms/[type]/page.tsx` — server-fetch + `useIsmsDocument` SWR hook (fallbackData, `revalidateOnMount:!initialData`, guarded `mutate`). Editable register table with inline override, narrative fields (RHF + Zod), drift banner, submit-for-approval/approve UI (reuse SOA `SubmitApprovalDialog`/`SOAPendingApprovalAlert` patterns), PDF + DOCX export buttons.
- **Design system:** `PageLayout`/`PageHeader`/`Tabs`/`Stack`/`Card` from `@trycompai/design-system`; Carbon icons. Run `audit-design-system` after edits.

## 9. Release strategy — all-or-nothing, flag-gated

- Build **slice-first** (de-risk), but the `ISO 27001 (ISMS)` tab stays **off in production** behind an `isIsmsEnabled`-style flag resolved in `[orgId]/layout.tsx` (same pattern as `isQuestionnaireEnabled`/`isSecurityEnabled`) until **all six docs + wizard + PDF/DOCX** are complete.
- Rationale: DoD requires all six exportable in one session; a partial management-system pack is an **audit liability**, not a partial win; project defines Release 1 as the whole foundational pack.
- Framework-conditional visibility (ISO 27001 active) applies on top of the flag.

## 10. Build sequence

1. **Spec** (this doc). ✅
2. **Substrate slice:** `IsmsDocument`/`IsmsDocumentVersion` + `IsmsContextIssue` models + migration; ISMS API module (ensure-setup, generate, get, override, sign-off, drift, export) with RBAC + Jest tests; **DOCX renderer**.
3. **IA:** framework-grouped `DocumentsPageTabs` + `ISO 27001 (ISMS)` tab (flagged) + move SOA card.
4. **Context of the Organization (4.1) E2E:** detail page, hooks, generate/edit/override/drift/sign-off/export; Vitest tests (admin write vs read-only).
5. **Fast-follow (sub-tickets):** 4.2a, 4.2b/c, 4.3, 5.1, 6.2 registers + detail pages on the proven rail.
6. **Wizard (CS-438):** shared ~15-question component feeding un-derivable inputs.
7. **Flip the flag** when the pack is complete.

## 11. Testing

- **API (Jest):** generate/autofill, override recording, drift computation, sign-off transitions, export dispatch; admin (write) + read-only (`evidence:read` only) permission scenarios.
- **App (Vitest + testing-library):** overview cards, document detail edit/override, drift banner, approval gating, export buttons; admin vs read-only.
- TDD for non-trivial logic (drift, autofill mapping). Typecheck (`turbo run typecheck`) after each milestone.

## 12. Open items to confirm during build

- Clause **6.2** existence as an ISO 27001 requirement (§3.3).
- Whether a direct `IsmsDocument.requirementId → FrameworkEditorRequirement` FK is sufficient for the auditor-view link, or a join table is needed for multi-requirement docs (e.g., 4.2b/c spanning 4.2b + 4.2c).
- Exact derive-vs-ask split per document (wizard CS-438 has the detailed inventory; ~15-question cap).
