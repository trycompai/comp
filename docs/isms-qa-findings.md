# ISMS — manual QA findings (CS-437)

Live walkthrough on a running dev env (org `org_6a19...`, ISO 27001 active).
Browser extension disconnected partway through; remaining flows still need testing.

## Tested & working ✅
- **Overview** (`/documents?tab=iso-27001`): tabs (ISO 27001 (ISMS) / Company Forms / Settings), summary stat row (Documents / Approved / Outstanding / Needs review), 3-up document card grid (clause chip · title · description · status), SOA section. Renders cleanly.
- **Detail page — Context of the Organization (register):** header (clause + status + Generate / Export PDF / Export DOCX), Linked controls section, Issues register (Internal/External tables with AUTO-DERIVED source badges + editable cells + add forms).
- **Add register row:** "Add external issue" → row added, count incremented, "Issue added" toast, form cleared. ✅
- **Delete register row:** trash → row removed immediately, count decremented, "Issue deleted" toast (no blocking dialog). ✅
- **Link control:** "+ Link control" opens a searchable control picker (org controls load); selecting one links it ("Control linked successfully" toast) and it appears as a row with open/unlink affordances. ✅

## Issues found 🐛
1. **Manual register rows show an "EDITED" badge.** A brand-new *manually added* row is labelled `EDITED` (the `manual` source). "Edited" implies a derived row that was changed; a net-new manual entry should read "Manual" / "Added". — `IsmsSourceBadge` label mapping. [minor]
2. **Approved document still shows a plain "Submit for approval" button.** On Context (status = APPROVED), the approval area shows only "Submit for approval" — no "approved by / on", no approved state. The approval section doesn't reflect the document's actual status. — `IsmsApprovalSection` state handling. [bug / UX]
3. **Detail-page content ordering.** Order is Header → Linked controls → Submit for approval → **Issues register (the actual content)**. The primary artifact is pushed below the fold under the secondary mapping/approval sections. Should be **content-first**: Header → register/narrative → Linked controls → Approval. [UX]
4. **"No controls linked" empty state is excessively tall.** Wastes a large vertical band when empty (collapses once a control is linked). Tighten the empty state height. [minor UX]
5. **Register-row delete has no confirmation.** Instant delete on trash click (toast only). Fine for manual rows, but easy to mis-click on derived content; consider a confirm or undo. [minor / low priority]

## Wizard — code review (browser was down; logic traced instead) 🔍
Logic is **sound and complete**: 6 steps cover all 12 fields; per-step `trigger(step.fields)` + partial save; `pickStepAnswers` slices by top-level key so nested objects (`deputySpo`/`insurance`/`cloudScopeSplit`/`euRep`) are sent whole (API shallow-merge safe — no sibling wipe); Finish runs full-schema validate → `complete()` → `generateAll()` → redirect. Schema only requires `certificateScopeSentence` + each `objectives[].objective` (both seeded from defaults), so conditional branches (deputy SPO "to be named", EU-rep not-required/pending, insurance "no") don't block completion. Still needs a **live visual/interaction pass** (rendering, selects/switches, certificate-scope emphasis, the generating transition).

6. **Finish-validation failure is opaque.** `handleFinish` validates the whole form; on failure it shows a generic "Please complete every step before finishing." toast but does NOT navigate to the offending step or show the field error (errors only render on the *current* step). If e.g. `certificateScopeSentence` (step 5) is cleared, the user on step 6 sees a generic error with no way to find it. Fix: jump to the first step with an error + surface it. [UX]
7. **Form won't re-seed if the profile loads after mount.** `useForm` reads `defaultValues` once; `initialProfile = profile ?? fallbackData`. SSR provides `fallbackData`, so normally fine — but if SSR fetch returned null and SWR fills in later, the form stays empty (no `reset` on profile load). [minor / edge]

## Wizard — live walkthrough ✅ (all 6 steps + Finish → generate → redirect)
Stepped through every step on the running env: stepper/progress, per-step Save + Next, conditional fields (insurance insurer name, EU-rep name), editable lists (cloud scope split, objectives, intended outcomes), emphasized certificate-scope step, and **Finish & generate** → ran complete + generate-all → redirected to the overview with all 6 docs regenerated. Core flow solid. New issues:

8. **Wizard Selects display the raw value, not the label.** After choosing the deputy the field shows `mem_6a19…` (not "Mariano Fuentes"); the audit-approach field shows `in_house` (not "In-house team"). Dropdown *options* show labels correctly — only the closed/selected display is wrong. Affects every `Select` in the wizard. — Select `value`→label wiring. [bug]
9. **Console error: Base UI Select "uncontrolled → controlled".** The wizard Selects initialise with `value={undefined}` then become controlled (this is the red "1 Issue" dev badge). Pass a stable controlled value (default `''`/the field value) so it's controlled from first render. Same root as #8. [bug / console]
10. **"Capabilities in production" is a single lump, not an itemised tick-list.** The whole "Types of Services" paragraph renders as one checkbox; the ticket envisioned per-capability items the customer can untick individually. Depends on how services are stored. [minor]
11. **Certificate scope sentence has a double space** ("…of Comp AI  covers…") — derived-sentence templating joins org name + clause with an extra space. [cosmetic]

## Not yet tested ⏳
- **Generate from platform data** on a DRAFT doc.
- **Submit-for-approval → approve / decline** end to end (on a draft).
- **Narrative docs** — ISMS Scope (4.3) + Leadership (5.1) forms.
- **Other register docs** — Interested Parties (4.2a), Requirements (4.2b/c), Objectives (6.2) detail pages.
- **Export PDF / DOCX** actual file download + branding.
- **Company Forms** + **Settings** tabs (regression — unchanged, but confirm).
- **Framework Editor** ISMS Documents mapping page (separate app/port).
