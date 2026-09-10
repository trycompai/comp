# CMMC Level 2 — framework definition

CMMC 2.0 Level 2: 110 practices for protecting Controlled Unclassified
Information (CUI), aligned to NIST SP 800-171 Rev 2.

## Contents

| File | What it is |
|---|---|
| `cmmc-level-2.import.json` | The import payload. Matches `ImportFrameworkDto`. |
| `import-cmmc.ts` | Inserts the payload directly via Prisma. |
| `generator/practices.py` | The 110 practices: NIST id, title, requirement statement. |
| `generator/build.py` | Builds the payload (requirements, controls, policies, tasks + index links). |
| `generator/add_content.py` | Adds TipTap policy body content. |

## What it contains

- 110 requirements across 14 families (AC 22, AT 3, AU 9, CM 9, IA 11,
  IR 3, MA 6, MP 9, PS 2, PE 6, RA 3, CA 4, SC 16, SI 7)
- 36 control templates — every requirement covered by at least one
- 14 policy templates (one per family) with body content
- 25 task templates
- Identifiers use CMMC practice format, e.g. `AC.L2-3.1.1`

## Importing

Preferred — the API, which is the supported path:

    POST /v1/framework-editor/framework/import

It sits behind `PlatformAdminGuard`, so it needs a browser session from a
user whose `User.role = 'admin'`.

Fallback used here, when no session is available (e.g. headless):

    cd packages/db && bun scripts/import-cmmc.ts <path-to>/cmmc-level-2.import.json

`import-cmmc.ts` mirrors `FrameworkExportService.import()` in
`apps/api/src/framework-editor/framework/framework-export.service.ts` —
same entities, same link rows, one transaction. If that service changes,
re-check this script. It refuses to run if a framework with the same name
already exists.

## Regenerating

    python3 generator/build.py && python3 generator/add_content.py

(The generator writes to the path hardcoded at the bottom of `build.py`.)

## Accuracy

Requirement statements paraphrase NIST SP 800-171 Rev 2. Family counts and
practice identifiers were checked against the published structure and total
110. The control groupings, policies, and tasks are an editorial layer, not
part of the standard. **Verify the requirement text against the official
NIST publication before relying on this for an actual assessment.**
